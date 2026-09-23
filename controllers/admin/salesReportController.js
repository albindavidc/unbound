// salesReportController.js

const puppeteer = require("puppeteer");
const excelJs = require("exceljs");
const path = require("path");
const fs = require("fs");
const PDFDocument = require("pdfkit");

const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
function buildMatchCondition(query) {
  const reportType = query.reportType || "yearly";
  const startDateStr = query.startDate;
  const endDateStr = query.endDate;

  let matchCondition = {};
  let now = new Date();

  if (startDateStr && endDateStr) {
    let start = new Date(startDateStr);
    let end = new Date(endDateStr);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      start.setUTCHours(0, 0, 0, 0);
      end.setUTCHours(23, 59, 59, 999);
      matchCondition.createdAt = { $gte: start, $lte: end };
      return matchCondition;
    }
  }

  switch (reportType) {
    case "daily":
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      matchCondition.createdAt = { $gte: startOfToday };
      break;
    case "weekly":
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - 7);
      matchCondition.createdAt = { $gte: startOfWeek };
      break;
    case "monthly":
      const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
      matchCondition.createdAt = { $gte: startOfMonth, $lte: endOfMonth };
      break;
    case "yearly":
    default:
      const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
      const endOfYear = new Date(Date.UTC(now.getUTCFullYear(), 11, 31, 23, 59, 59, 999));
      matchCondition.createdAt = { $gte: startOfYear, $lte: endOfYear };
      break;
  }
  return matchCondition;
}

module.exports = {
  // Get Sales Report
  getSalesReport: async (req, res) => {
    try {
      const locals = {
        title: "Sales Report",
      };

      const reportType = req.query.reportType || "yearly";
      const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
      const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

      let endOfDay;

      let matchCondition = {};
      let now = new Date();

      switch (reportType) {
        case "daily":
          matchCondition.createdAt = { $gte: new Date(now.setHours(0, 0, 0, 0)) };
          break;
        case "weekly":
          const startOfWeek = new Date();
          startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
          matchCondition.createdAt = { $gte: startOfWeek };
          break;

        case "monthly":
          const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
          const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
          endOfMonth.setUTCHours(23, 59, 59, 999);

          matchCondition.createdAt = {
            $gte: startOfMonth,
            $lte: endOfMonth,
          };
          break;

        case "yearly":
          const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
          const endOfYear = new Date(Date.UTC(now.getUTCFullYear(), 11, 31));
          endOfYear.setUTCHours(23, 59, 59, 999);

          matchCondition.createdAt = {
            $gte: startOfYear,
            $lte: endOfYear,
          };
          break;

        case "custom":
          if (startDate && endDate) {
            matchCondition.createdAt = {
              $gte: new Date(startDate),
              $lte: new Date(new Date(endDate).setUTCHours(23, 59, 59, 999)),
            };
          } else {
            throw new Error("Custom date range is required for custom report type.");
          }
          break;

        default:
          throw new Error("Invalid report type.");
      }

      let perpage = 10;
      let page = parseInt(req.query.page) || 1;

      const orders = await Order.find(matchCondition)
        .populate({
          path: "items.productId",
          select: "name price offerDiscountPrice offerDiscountPersantage categoryDiscountAmount",
        })
        .populate({
          path: "customerId",
          select: "name email referralCode refferalRewards",
        })
        .populate({
          path: "shippingAddress",
          select: "addressLine1 city state postalCode",
        })
        .skip((page - 1) * perpage)
        .limit(perpage)
        .sort({ createdAt: -1 })
        .exec();

      const totalOrders = await Order.countDocuments(matchCondition);
      const nextPage = parseInt(page) + 1;
      const totalPages = Math.ceil(totalOrders / perpage);
      const hasPrevPage = page > 1;
      const hasNextPage = page < totalPages;

      // Calculate the total amount and discount using aggregation
      const totalAmount = await Order.aggregate([
        { $match: matchCondition },
        { $unwind: "$items" },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: { $multiply: ["$items.quantity", { $toDouble: "$items.price" }] } },
            totalDiscount: { $sum: "$couponDiscount" },
          },
        },
      ]);

      const overallAmount = totalAmount.length ? totalAmount[0].totalAmount : 0;
      const overallDiscount = totalAmount.length ? totalAmount[0].totalDiscount : 0;

      const reportData = orders.map((order) => ({
        orderId: order.orderId,
        userName: `${order.customerId.name}`,
        userEmail: order.customerId.email,
        referralCode: order.customerId.referralCode,
        referralRewards: order.customerId.refferalRewards,
        shippingAddress: `${order.shippingAddress.addressLine1}, ${order.shippingAddress.city}, ${order.shippingAddress.state}, ${order.shippingAddress.postalCode}`,
        products: order.items.map((product) => ({
          name: product.productId.name,
          price: product.productId.sellingPrice,
          discountPrice: product.productId.offerDiscountPrice,
          categoryDiscount: product.productId.categoryDiscountAmount,
          quantity: product.quantity,
          totalPrice: product.totalPrice,
        })),
        totalAmount: order.totalPrice,
        offerAppliedTotalAmount: order.offerAppliedTotalAmount,
        couponDiscount: order.couponDiscount,
        status: order.status,
        paymentMethod: order.paymentMethod,
        createdAt: order.createdAt,
      }));

      res.render("admin/salesReport", {
        locals,
        orders: reportData,
        pagination: reportData,
        totalOrders,
        overallAmount,
        overallDiscount,
        reportType,
        startDate,
        endDate,
        currentPage: page,
        perPage: perpage,
        nextPage,
        hasPrevPage,
        hasNextPage,
        totalPages,
      });
    } catch (error) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: "An error occurred while fetching the sales report." });
    }
  },

  // Export to Excel
  exportToExcel: async (req, res) => {
    try {
      const matchCondition = buildMatchCondition(req.query);

      let orders = await Order.find(matchCondition)
        .populate({ path: "customerId", select: "name email" })
        .populate({ path: "items.productId", select: "name price" })
        .populate({ path: "shippingAddress" })
        .lean();

      const excelData = orders.flatMap((order) =>
        (order.items || []).map((item) => {
          const prodName = item.productId?.name || item.name || "Product";
          const custName = order.customerId?.name || order.customerId?.email || order.userName || "Customer";
          const price = item.price || item.productId?.price || 0;
          const qty = item.quantity || 1;
          const itemTotal = item.totalPrice || price * qty;

          let addrStr = "N/A";
          if (order.shippingAddress) {
            addrStr = `${order.shippingAddress.addressLine1 || order.shippingAddress.address || ""}, ${order.shippingAddress.city || ""}, ${order.shippingAddress.state || ""}, ${order.shippingAddress.postalCode || order.shippingAddress.zipcode || ""}`;
          }

          return {
            _id: order.orderId || (order._id ? order._id.toString().slice(-7).toUpperCase() : "N/A"),
            customer: custName,
            productName: prodName,
            price: price,
            quantity: qty,
            itemTotal: itemTotal,
            totalAmount: order.totalPrice || order.finalAmount || 0,
            paymentMethod: order.paymentMethod || "N/A",
            status: order.status || "N/A",
            createdAt: order.createdAt ? new Date(order.createdAt).toISOString().split("T")[0] : "N/A",
          };
        }),
      );

      const workBook = new excelJs.Workbook();
      const worksheet = workBook.addWorksheet("Sales Report");

      const logoPath = path.join(__dirname, "../../public/uploads/profile/logo.png");
      if (fs.existsSync(logoPath)) {
        try {
          const logoImage = fs.readFileSync(logoPath);
          const imageId = workBook.addImage({
            buffer: logoImage,
            extension: "png",
          });
          worksheet.addImage(imageId, {
            tl: { col: 0, row: 0 },
            ext: { width: 160, height: 50 },
          });
        } catch (imgErr) {
          console.error("Logo embedding error:", imgErr);
        }
      }

      worksheet.columns = [
        { header: "Order ID", key: "_id", width: 15 },
        { header: "Customer", key: "customer", width: 25 },
        { header: "Product Name", key: "productName", width: 30 },
        { header: "Price (₹)", key: "price", width: 12 },
        { header: "Quantity", key: "quantity", width: 10 },
        { header: "Item Total (₹)", key: "itemTotal", width: 15 },
        { header: "Order Total (₹)", key: "totalAmount", width: 15 },
        { header: "Payment Method", key: "paymentMethod", width: 15 },
        { header: "Status", key: "status", width: 15 },
        { header: "Date", key: "createdAt", width: 15 },
      ];

      worksheet.mergeCells("A1:J4");
      const titleCell = worksheet.getCell("A1");
      titleCell.value = "UNBOUND - Sales Report";
      titleCell.font = { bold: true, size: 18, color: { argb: "FFFFFFFF" } };
      titleCell.alignment = { vertical: "middle", horizontal: "center" };
      titleCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF424649" },
      };

      const headersRow = worksheet.getRow(5);
      headersRow.values = worksheet.columns.map((column) => column.header);
      headersRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headersRow.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF424649" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });

      excelData.forEach((row) => {
        worksheet.addRow(row);
      });

      const totalQuantity = excelData.reduce((sum, row) => sum + (row.quantity || 0), 0);
      const totalPrice = excelData.reduce((sum, row) => sum + (row.itemTotal || 0), 0);

      worksheet.addRow([]);
      const summaryRow = worksheet.addRow({
        productName: "TOTAL",
        quantity: totalQuantity,
        itemTotal: totalPrice,
      });

      summaryRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.alignment = { horizontal: "center" };
      });

      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber > 5) {
          row.eachCell((cell) => {
            cell.alignment = { vertical: "middle", horizontal: "center" };
          });
          if (rowNumber % 2 === 0) {
            row.eachCell({ includeEmpty: true }, (cell) => {
              cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8F9FA" } };
            });
          }
        }
      });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=SalesReport.xlsx");
      await workBook.xlsx.write(res);
      res.status(HTTP_STATUS.OK).end();
    } catch (err) {
      console.error("Error generating Excel:", err);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Internal Server Error generating Excel report");
    }
  },

  // Export to PDF
  exportToPdf: async (req, res) => {
    try {
      const matchCondition = buildMatchCondition(req.query);

      const orders = await Order.find(matchCondition)
        .populate({ path: "customerId", select: "name email" })
        .populate({ path: "items.productId", select: "name price" })
        .lean();

      const doc = new PDFDocument({ margin: 20, size: "A4" });

      res.setHeader("Content-Disposition", 'attachment; filename="SalesReport.pdf"');
      res.setHeader("Content-Type", "application/pdf");

      doc.pipe(res);

      const logoPath = path.join(__dirname, "../../public/uploads/profile/logo.png");
      if (fs.existsSync(logoPath)) {
        try {
          const logoImage = fs.readFileSync(logoPath);
          doc.image(logoImage, { fit: [150, 50], align: "center", valign: "top" });
          doc.moveDown(2);
        } catch (e) {
          console.error("Logo error in PDF:", e);
        }
      }

      doc.fontSize(20).font("Helvetica-Bold").text("Sales Report", { align: "center" }).moveDown();

      if (!orders || orders.length === 0) {
        doc.fontSize(12).font("Helvetica").text("No sales orders found for the selected period.", { align: "center" });
        doc.end();
        return;
      }

      let totalQuantity = 0;
      let totalPrice = 0;

      orders.forEach((order) => {
        (order.items || []).forEach((item) => {
          totalQuantity += item.quantity || 1;
        });
        totalPrice += order.totalPrice || order.finalAmount || 0;
      });

      const margins = { left: 20, top: 110 };
      const columnWidths = {
        orderId: 75,
        date: 75,
        customer: 85,
        products: 135,
        totalAmount: 65,
        paymentMethod: 65,
        status: 55,
      };
      const rowHeight = 25;

      let yPosition = margins.top + 25;

      const drawHeader = () => {
        doc.fontSize(9).font("Helvetica-Bold");
        doc.text("Order ID", margins.left, margins.top, { width: columnWidths.orderId, align: "left" });
        doc.text("Date", margins.left + columnWidths.orderId, margins.top, { width: columnWidths.date, align: "left" });
        doc.text("Customer", margins.left + columnWidths.orderId + columnWidths.date, margins.top, { width: columnWidths.customer, align: "left" });
        doc.text("Products", margins.left + columnWidths.orderId + columnWidths.date + columnWidths.customer, margins.top, {
          width: columnWidths.products,
          align: "left",
        });
        doc.text("Total", margins.left + columnWidths.orderId + columnWidths.date + columnWidths.customer + columnWidths.products, margins.top, {
          width: columnWidths.totalAmount,
          align: "left",
        });
        doc.text(
          "Payment",
          margins.left + columnWidths.orderId + columnWidths.date + columnWidths.customer + columnWidths.products + columnWidths.totalAmount,
          margins.top,
          { width: columnWidths.paymentMethod, align: "left" },
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
          { width: columnWidths.status, align: "left" },
        );

        doc.strokeColor("#424649").lineWidth(1);
        doc
          .moveTo(margins.left, margins.top + 18)
          .lineTo(575, margins.top + 18)
          .stroke();
        yPosition = margins.top + 25;
      };

      drawHeader();

      doc.fontSize(8).font("Helvetica");

      orders.forEach((order) => {
        const orderDate = order.createdAt ? new Date(order.createdAt).toISOString().split("T")[0] : "N/A";
        const productNames = (order.items || []).map((item) => `${item.productId?.name || item.name || "Item"} (x${item.quantity || 1})`).join(", ");
        const customerName = order.customerId?.name || order.customerId?.email || order.userName || "Customer";
        const orderIdStr = order.orderId || (order._id ? order._id.toString().slice(-7).toUpperCase() : "N/A");

        if (yPosition > doc.page.height - 60) {
          doc.addPage();
          drawHeader();
        }

        doc.text(orderIdStr, margins.left, yPosition, { width: columnWidths.orderId, align: "left" });
        doc.text(orderDate, margins.left + columnWidths.orderId, yPosition, { width: columnWidths.date, align: "left" });
        doc.text(customerName, margins.left + columnWidths.orderId + columnWidths.date, yPosition, { width: columnWidths.customer, align: "left" });
        doc.text(productNames, margins.left + columnWidths.orderId + columnWidths.date + columnWidths.customer, yPosition, {
          width: columnWidths.products,
          align: "left",
        });
        doc.text(
          `Rs. ${order.totalPrice || 0}`,
          margins.left + columnWidths.orderId + columnWidths.date + columnWidths.customer + columnWidths.products,
          yPosition,
          { width: columnWidths.totalAmount, align: "left" },
        );
        doc.text(
          order.paymentMethod || "Online",
          margins.left + columnWidths.orderId + columnWidths.date + columnWidths.customer + columnWidths.products + columnWidths.totalAmount,
          yPosition,
          { width: columnWidths.paymentMethod, align: "left" },
        );
        doc.text(
          order.status || "Completed",
          margins.left +
            columnWidths.orderId +
            columnWidths.date +
            columnWidths.customer +
            columnWidths.products +
            columnWidths.totalAmount +
            columnWidths.paymentMethod,
          yPosition,
          { width: columnWidths.status, align: "left" },
        );

        yPosition += rowHeight;
      });

      // Footer summary
      if (yPosition > doc.page.height - 80) {
        doc.addPage();
        yPosition = 50;
      }

      doc.strokeColor("#cccccc").lineWidth(1);
      doc.moveTo(margins.left, yPosition).lineTo(575, yPosition).stroke();
      yPosition += 15;

      doc.fontSize(10).font("Helvetica-Bold");
      doc.text(`Total Orders: ${orders.length}`, margins.left, yPosition);
      doc.text(`Total Items Sold: ${totalQuantity}`, margins.left + 150, yPosition);
      doc.text(`Overall Amount: Rs. ${totalPrice.toFixed(2)}`, margins.left + 350, yPosition);

      doc.end();
    } catch (err) {
      console.error("Error generating PDF:", err);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Internal Server Error generating PDF report");
    }
  },
};
