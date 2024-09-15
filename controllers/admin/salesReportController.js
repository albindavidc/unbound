const puppeteer = require("puppeteer");
const excelJS = require("exceljs");
const path = require("path");
const fs = require("fs");
const PDFDocument = require("pdfkit");

const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");

// const { fetchSalesReportData } = require('../utils/salesReportUtils'); // Adjust the path as needed

module.exports = {
  getSalesReport: async (req, res) => {
    try {
      const locals = {
        title: "Sales Report",
      };
      const perPage = 50;
      const page = req.query.page || 1;
      const reportType = req.query.reportType || "daily";
      const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
      const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

      let matchCondition = {}; // Remove the base return: false to avoid unintended filtering
      const now = new Date();
      let endOfDay; // To store the end of the time period

      console.log(reportType, "this is the report type"); // Debug reportType

      switch (reportType) {
        case "daily":
          matchCondition.createdAt = {
            $gte: new Date(new Date(now).setUTCHours(0, 0, 0, 0)), // Clone now
            $lte: new Date(new Date(now).setUTCHours(23, 59, 59, 999)), // End of the day
          };
          break;

        case "weekly":
          const startOfWeek = new Date(now);
          const dayOfWeek = startOfWeek.getUTCDay() === 0 ? 6 : startOfWeek.getUTCDay() - 1; // Monday as the start
          startOfWeek.setUTCDate(startOfWeek.getUTCDate() - dayOfWeek); // Set to start of week
          startOfWeek.setUTCHours(0, 0, 0, 0);

          // Set end of the week (Sunday)
          endOfDay = new Date(startOfWeek);
          endOfDay.setUTCDate(endOfDay.getUTCDate() + 6);
          endOfDay.setUTCHours(23, 59, 59, 999);

          matchCondition.createdAt = {
            $gte: startOfWeek,
            $lte: endOfDay,
          };
          break;

        case "monthly":
          const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
          endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)); // Last day of the month
          endOfDay.setUTCHours(23, 59, 59, 999); // End of the day

          matchCondition.createdAt = {
            $gte: startOfMonth,
            $lte: endOfDay,
          };
          break;

        case "yearly":
          const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
          endOfDay = new Date(Date.UTC(now.getUTCFullYear(), 11, 31)); // End of the year
          endOfDay.setUTCHours(23, 59, 59, 999);

          matchCondition.createdAt = {
            $gte: startOfYear,
            $lte: endOfDay,
          };
          break;

        case "custom":
          if (startDate && endDate) {
            matchCondition.createdAt = {
              $gte: new Date(startDate),
              $lte: new Date(new Date(endDate).setUTCHours(23, 59, 59, 999)), // End of the custom range
            };
          } else {
            throw new Error("Custom date range is required for custom report type.");
          }
          break;

        default:
          throw new Error("Invalid report type.");
      }

      console.log(matchCondition, "this is the matchCondition"); // Debug matchCondition

      // Fetch orders with pagination and populate required fields
      const orders = await Order.find(matchCondition)
        .populate({
          path: "items.productId",
          select: "name price offerDiscountPrice offerDiscountPersantage categoryDiscountAmount", // Selecting required product fields
        })
        .populate({
          path: "customerId",
          select: "name email referralCode refferalRewards",
        })
        .populate({
          path: "shippingAddress",
          select: "addressLine1 city state postalCode",
        })
        .sort({ createdAt: -1 })
        .skip(perPage * (page - 1))
        .limit(perPage)
        .exec();
      console.log(orders, "this is the orders");

      const totalOrders = await Order.countDocuments(matchCondition);

      // Calculate the total amount and discount using aggregation
      const totalAmount = await Order.aggregate([
        { $match: matchCondition },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$offerAppliedTotalAmount" },
            totalDiscount: { $sum: "$couponDiscount" },
          },
        },
      ]);

      const overallAmount = totalAmount.length ? totalAmount[0].totalAmount : 0;
      const overallDiscount = totalAmount.length ? totalAmount[0].totalDiscount : 0;

      // Pagination details
      const count = await Order.countDocuments(matchCondition);
      const nextPage = parseInt(page) + 1;
      const hasNextPage = nextPage <= Math.ceil(count / perPage);

      const breadcrumbs = [
        { name: "Home", url: "/admin" },
        { name: "Sales Report", url: "/admin/sales-report" },
        { name: `Page ${page}`, url: `/admin/sales-report?page=${page}` },
      ];

      // Now you have populated orders with all details, you can create variables to store the data you need:
      const reportData = orders.map((order) => ({
        orderId: order.orderId,
        userName: `${order.customerId.name}`,
        userEmail: order.customerId.email,
        referralCode: order.customerId.referralCode,
        referralRewards: order.customerId.refferalRewards,
        shippingAddress: `${order.shippingAddress.addressLine1}, ${order.shippingAddress.city}, ${order.shippingAddress.state}, ${order.shippingAddress.postalCode}`,
        products: order.items.map((product) => ({
          name: product.productId.name,
          price: product.productId.price,
          discountPrice: product.productId.offerDiscountPrice,
          categoryDiscount: product.productId.categoryDiscountAmount,
          quantity: product.quantity,
          totalPrice: product.totalprice,
        })),
        totalAmount: order.totalAmount,
        offerAppliedTotalAmount: order.offerAppliedTotalAmount,
        couponDiscount: order.couponDiscount,
        status: order.status,
        paymentMethod: order.paymentMethod,
        createdAt: order.createdAt,
      }));

      res.render("admin/salesReport", {
        locals,
        orders: reportData, // Pass the processed data to the view
        current: page,
        perPage,
        pages: Math.ceil(count / perPage),
        nextPage: hasNextPage ? nextPage : null,
        breadcrumbs,
        totalOrders,
        overallAmount,
        overallDiscount,
        reportType,
        startDate,
        endDate,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: "An error occurred while fetching the sales report." });
    }
  },

  salesReportExcel: async (req, res) => {
    let startDate = req.query.startDate ? new Date(req.query.startDate) : new Date();
    let endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
    startDate.setUTCHours(0, 0, 0, 0);
    endDate.setUTCHours(23, 59, 59, 999);

    console.log(startDate, endDate);
    const orders = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $nin: ["Cancelled", "Failed"] },
        },
      },
      {
        $lookup: {
          from: "addresses",
          localField: "shippingAddress",
          foreignField: "_id",
          as: "shippingAddress",
        },
      },
      { $unwind: { path: "$shippingAddress", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "users",
          localField: "customerId",
          foreignField: "_id",
          as: "customer",
        },
      },
      { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "coupons",
          localField: "coupon",
          foreignField: "_id",
          as: "coupon",
        },
      },
      { $unwind: { path: "$coupon", preserveNullAndEmptyArrays: true } },

      { $unwind: "$items" }, // Ensure 'items' field is array and exists

      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "items.productDetails",
        },
      },
      { $unwind: { path: "$items.productDetails", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "colors",
          localField: "items.color",
          foreignField: "_id",
          as: "items.color",
        },
      },
      { $unwind: { path: "$items.color", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "sizes",
          localField: "items.size",
          foreignField: "_id",
          as: "items.size",
        },
      },
      { $unwind: { path: "$items.size", preserveNullAndEmptyArrays: true } },

      {
        $group: {
          _id: "$_id",
          userID: { $first: "$customer" },
          shippingAddress: { $first: "$shippingAddress" },
          paymentMethod: { $first: "$paymentMethod" },
          status: { $first: "$status" },
          totalAmount: { $first: "$totalPrice" },
          coupon: { $first: "$coupon" },
          couponDiscount: { $first: "$couponDiscount" },
          payable: { $first: "$payable" },
          categoryDiscount: { $first: "$categoryDiscount" },
          createdAt: { $first: "$createdAt" },
          orderedItems: {
            $push: {
              productDetails: {
                product_name: "$items.productDetails.product_name",
                price: "$items.price",
              },
              quantity: "$items.quantity",
              color: "$items.color.name",
              size: "$items.size.value",
              itemTotal: { $multiply: ["$items.price", "$items.quantity"] },
            },
          },
        },
      },
    ]);

    const workBook = new excelJS.Workbook();
    const worksheet = workBook.addWorksheet("Sales Report");

    worksheet.columns = [
      { header: "Order ID", key: "_id" },
      { header: "Customer ID", key: "userID.userId" },
      { header: "Payment Method", key: "paymentMethod" },
      { header: "Payment Status", key: "status" },
      { header: "Shipping Address", key: "shippingAddress.0.address" },
      { header: "Total Amount", key: "totalAmount" },
      { header: "Coupon Applied", key: "coupon.0.code" },
      { header: "Discount Amount", key: "couponDiscount" },
      { header: "Final Price", key: "payable" },
      { header: "Category Discount", key: "categoryDiscount" },
      { header: "Order Date", key: "createdAt" },
      {
        header: "Ordered Items",
        key: "orderedItems",
        style: {
          font: { bold: true },
        },
      },
    ];

    orders.forEach((order) => {
      worksheet.addRow(order);
    });

    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
    });

    res.setHeader("content-Type", "application/vnd.openxmlformats-officedocument.spreadsheatml.sheet");
    res.setHeader("content-Disposition", "attachment; filename=sales-report_.xlsx");

    return workBook.xlsx.write(res).then(() => {
      res.status(200);
    });
  },

  exportToPdf: async (req, res) => {
    try {
      // Parse and validate date parameters
      let startDate = new Date(req.query.startDate);
      let endDate = new Date(req.query.endDate);

      // Check if the dates are valid
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).send("Invalid date range");
      }

      // Set default dates if not provided
      if (isNaN(startDate.getTime())) startDate = new Date();
      if (isNaN(endDate.getTime())) endDate = new Date();

      startDate.setUTCHours(0, 0, 0, 0);
      endDate.setUTCHours(23, 59, 59, 999);

      // Fetch orders
      const orders = await Order.find({
        createdAt: { $gte: startDate, $lte: endDate },
        return: false,
      })
        .populate({ path: "userId", select: "firstName lastName" })
        .populate({ path: "products._id", select: "productName" })
        .lean();

      const doc = new PDFDocument({ margin: 20, size: "A4" });

      let filename = "sales_report.pdf";
      filename = encodeURIComponent(filename);
      res.setHeader("content-disposition", `attachment; filename="${filename}"`);
      res.setHeader("content-type", "application/pdf");

      doc.fontSize(15).text("Sales Report", { align: "center" }).moveDown();

      // Define column widths and starting positions
      const margins = { left: 20, top: 50 };
      const columnWidths = {
        orderId: 80,
        date: 80,
        customer: 80,
        products: 120,
        totalAmount: 60,
        paymentMethod: 70,
        status: 80,
      };
      const rowHeight = 30;
      const maxRowsPerPage = 20; // Max rows per page

      let yPosition = margins.top + rowHeight * 2;
      let currentPage = 1;

      // Draw table header
      const drawHeader = () => {
        doc.fontSize(10).font("Helvetica-Bold");
        doc.text("Order ID", margins.left, margins.top, { width: columnWidths.orderId, align: "left" });
        doc.text("Date", margins.left + columnWidths.orderId, margins.top, { width: columnWidths.date, align: "left" });
        doc.text("Customer", margins.left + columnWidths.orderId + columnWidths.date, margins.top, { width: columnWidths.customer, align: "left" });
        doc.text("Products", margins.left + columnWidths.orderId + columnWidths.date + columnWidths.customer, margins.top, {
          width: columnWidths.products,
          align: "left",
        });
        doc.text(
          "Total Amount",
          margins.left + columnWidths.orderId + columnWidths.date + columnWidths.customer + columnWidths.products,
          margins.top,
          { width: columnWidths.totalAmount, align: "left" }
        );
        doc.text(
          "Payment Method",
          margins.left + columnWidths.orderId + columnWidths.date + columnWidths.customer + columnWidths.products + columnWidths.totalAmount,
          margins.top,
          { width: columnWidths.paymentMethod, align: "left" }
        );
        doc.text(
          "Status",
          margins.left +
            columnWidths.orderId +
            columnWidths.date +
            columnWidths.customer +
            columnWidths.products +
            columnWidths.totalAmount +
            columnWidths.paymentMethod,
          margins.top,
          { width: columnWidths.status, align: "left" }
        );
        doc.moveDown();

        // Draw a line under the header
        doc.strokeColor("black").lineWidth(1);
        doc
          .moveTo(margins.left, margins.top + rowHeight)
          .lineTo(margins.left + Object.values(columnWidths).reduce((acc, width) => acc + width, 0), margins.top + rowHeight)
          .stroke();
        yPosition = margins.top + rowHeight + 10; // Adjust yPosition after the line
      };

      // Draw a line before each order details
      const drawSeparatorLine = () => {
        doc.strokeColor("black").lineWidth(1);
        doc
          .moveTo(margins.left, yPosition)
          .lineTo(margins.left + Object.values(columnWidths).reduce((acc, width) => acc + width, 0), yPosition)
          .stroke();
        yPosition += 5; // Space after the line
      };

      // Wrap text function
      const wrapText = (text, width) => {
        const lines = [];
        let line = "";
        const words = text.split(" ");

        for (const word of words) {
          const testLine = line + word + " ";
          const widthOfTestLine = doc.widthOfString(testLine);
          if (widthOfTestLine > width) {
            lines.push(line);
            line = word + " ";
          } else {
            line = testLine;
          }
        }
        lines.push(line);
        return lines;
      };

      // Draw table rows
      const drawRows = () => {
        doc.fontSize(10).font("Helvetica");
        let rowCount = 0;

        orders.forEach((order) => {
          const orderDate = order.createdAt.toISOString().split("T")[0];
          const productNames = order.products.map((item) => `${item._id.productName} (Qty: ${item.quantity})`).join(", ");
          const customerName = order.userId ? `${order.userId.firstName} ${order.userId.lastName}` : "";

          // Check if we need to add a new page
          if (yPosition > doc.page.height - margins.top - rowHeight) {
            doc.addPage();
            drawHeader();
            yPosition = margins.top + rowHeight * 2;
            rowCount = 0;
          }

          // Draw separator line before order details
          drawSeparatorLine();

          // Draw order ID
          doc.text(order._id.toString().slice(-7).toUpperCase(), margins.left, yPosition, { width: columnWidths.orderId, align: "left" });
          // Draw date
          doc.text(orderDate, margins.left + columnWidths.orderId, yPosition, { width: columnWidths.date, align: "left" });
          // Draw customer name
          doc.text(customerName, margins.left + columnWidths.orderId + columnWidths.date, yPosition, { width: columnWidths.customer, align: "left" });

          // Draw total amount
          doc.text(
            `₹${order.totalAmount.toFixed(2)}`,
            margins.left + columnWidths.orderId + columnWidths.date + columnWidths.customer + columnWidths.products,
            yPosition,
            { width: columnWidths.totalAmount, align: "left" }
          );
          // Draw payment method
          doc.text(
            order.paymentMethod,
            margins.left + columnWidths.orderId + columnWidths.date + columnWidths.customer + columnWidths.products + columnWidths.totalAmount,
            yPosition,
            { width: columnWidths.paymentMethod, align: "left" }
          );
          // Draw status
          doc.text(
            order.status,
            margins.left +
              columnWidths.orderId +
              columnWidths.date +
              columnWidths.customer +
              columnWidths.products +
              columnWidths.totalAmount +
              columnWidths.paymentMethod,
            yPosition,
            { width: columnWidths.status, align: "left" }
          );
          // Draw products
          const productLines = wrapText(productNames, columnWidths.products);
          productLines.forEach((line, index) => {
            if (index > 0) {
              yPosition += rowHeight; // Move to the next line if there's more text
              if (yPosition > doc.page.height - margins.top - rowHeight) {
                doc.addPage();
                drawHeader();
                yPosition = margins.top + rowHeight * 2;
              }
            }
            doc.text(line, margins.left + columnWidths.orderId + columnWidths.date + columnWidths.customer, yPosition, {
              width: columnWidths.products,
              align: "left",
            });
          });
          yPosition += rowHeight;
          rowCount++;

          // Check if we need to add a new page
          if (rowCount >= maxRowsPerPage) {
            doc.addPage();
            drawHeader();
            yPosition = margins.top + rowHeight * 2;
            rowCount = 0;
          }
        });
      };

      // Draw header and rows
      drawHeader();
      drawRows();

      // Sending the PDF
      doc.pipe(res);
      doc.end();
    } catch (err) {
      console.log(err);
      res.status(500).send("Internal Server Error");
    }
  },
};
