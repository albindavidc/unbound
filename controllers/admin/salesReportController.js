// salesReportController.js

const puppeteer = require("puppeteer");
const excelJs = require("exceljs");
const path = require("path");
const fs = require("fs");
const PDFDocument = require("pdfkit");

const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");

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
      res.status(500).json({ success: false, error: "An error occurred while fetching the sales report." });
    }
  },

  // Export to Excel
  exportToExcel: async (req, res) => {
    let startDate = req.query.startDate ? new Date(req.query.startDate) : new Date();
    let endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    // Set start and end of the day for the date range
    startDate.setUTCHours(0, 0, 0, 0);
    endDate.setUTCHours(23, 59, 59, 999);

    console.log(startDate, endDate, "these are the startdate and the end date");

    try {
      // Fetch orders within the date range
      let orders = await Order.find({
        createdAt: { $gte: startDate, $lte: endDate },
        return: { $ne: true },
      })
        .populate({ path: "customerId", select: "name" })
        .populate({ path: "items.productId", select: "name price" })
        .populate({ path: "shippingAddress" })
        .lean();

      console.log(orders, "this is the orders from backend excel");
      // Prepare data for Excel
      const excelData = orders.flatMap((order) =>
        order.items.map((product) => ({
          _id: order._id.toString().slice(-7).toUpperCase(),
          customer: `${order.customerId.name}`,
          productName: product.productId.name,
          price: product.price,
          quantity: product.quantity,
          itemTotal: product.itemTotal,
          totalAmount: order.totalPrice,
          shippingAddress: `${order.shippingAddress.address || ""}, ${order.shippingAddress.city || ""}, ${order.shippingAddress.state || ""}, ${
            order.shippingAddress.zipcode || ""
          }, ${order.shippingAddress.country || ""}`,
          paymentMethod: order.paymentMethod,
          status: order.status,
          createdAt: order.createdAt.toISOString().split("T")[0],
        }))
      );

      // Workbook and worksheet setup
      const workBook = new excelJs.Workbook();
      const worksheet = workBook.addWorksheet("Sales Report");

      const logoPath = "./public/uploads/profile/logo.png";
      const logoImage = fs.readFileSync(logoPath);
      const imageId = workBook.addImage({
        buffer: logoImage,
        extension: "png",
      });

      worksheet.addImage(imageId, {
        tl: { col: 0, row: 0 },
        ext: { width: 200, height: 100 },
      });

      // Define worksheet columns (starting from row 6)
      worksheet.columns = [
        { header: "Order ID", key: "_id", width: 15 },
        { header: "Customer", key: "customer", width: 25 },
        { header: "Product Name", key: "productName", width: 30 },
        { header: "Price", key: "price", width: 10 },
        { header: "Quantity", key: "quantity", width: 10 },
        { header: "Item Total", key: "itemTotal", width: 15 },
        { header: "Total Amount", key: "totalAmount", width: 15 },
        { header: "Payment Method", key: "paymentMethod", width: 15 },
        { header: "Status", key: "status", width: 15 },
        { header: "Date", key: "createdAt", width: 15 },
      ];

      worksheet.mergeCells("A1:J6");

      worksheet.getCell("A1").value = "Sales Report";
      worksheet.getCell("A1").font = {
        bold: true,
        size: 22,
        color: { argb: "FFFFFFFF" },
      };
      worksheet.getCell("A1").alignment = { vertical: "middle", horizontal: "center" };

      const headersRow = worksheet.getRow(6);
      headersRow.values = worksheet.columns.map((column) => column.header);
      headersRow.font = { bold: true };

      worksheet.getCell("A1").fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF000000" },
      };
      worksheet.getCell("A1").fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "000000" },
      };

      headersRow.eachCell((cell) => {
        cell.alignment = { horizontal: "center" };
      });

      // Adding rows
      excelData.forEach((row) => {
        worksheet.addRow(row);
      });

      const totalQuantity = excelData.reduceRight((sum, row) => sum + row.quantity, 0);
      const totalPrice = excelData.reduce((sum, row) => sum + row.itemTotal, 0);

      const totalDiscount = orders[0]?.totalDiscount || 0;

      worksheet.addRow([]);
      worksheet.addRow({
        productName: "Total",
        quantity: totalQuantity,
        itemTotal: totalPrice,
      });

      const totalRow = worksheet.lastRow;
      totalRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.alignment = { horizontal: "center" };
      });

      // Styling headers

      worksheet.getRow(6).eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "00FF00" } }; // Yellow Background
        cell.font = { bold: true, color: { argb: "000000" } }; // Black Text
        cell.alignment = { horizontal: "center" };
      });

      // Optional: Styling rows (alternating colors for better readability)
      worksheet.eachRow({ includeEmpty: false, skipHeader: true }, (row, rowNumber) => {
        row.eachCell((cell) => {
          cell.alignment = { vertical: "middle", horizontal: "center" };
        });
        // Add alternating row color
        if (rowNumber % 2 === 0) {
          row.eachCell({ includeEmpty: true }, (cell) => {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F2F2F2" } }; // Light Grey
          });
        }
      });

      worksheet.getCell("A1").fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF000000" },
      };
      worksheet.getCell("A1").fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "000000" },
      };

      // Sending the response
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=orders.xlsx");
      await workBook.xlsx.write(res);
      res.status(200).end();
    } catch (err) {
      console.error("Error generating Excel:", err);
      res.status(500).send("Internal Server Error");
    }
  },

  exportToPdf: async (req, res) => {
    try {
      let startDate = req.query.startDate ? new Date(req.query.startDate) : new Date();
      let endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ error: "Invalid date format" });
      }

      // Set start and end of the day for the date range
      startDate.setUTCHours(0, 0, 0, 0);
      endDate.setUTCHours(23, 59, 59, 999);

      // Fetch orders within the date range
      const orders = await Order.find({
        createdAt: { $gte: startDate, $lte: endDate },
        return: { $ne: true }, // Ensures return: false or undefined
      })
        .populate({ path: "customerId", select: "name" })
        .populate({ path: "items.productId", select: "name" })
        .lean();

      // Handle empty result or send response
      if (orders.length === 0) {
        return res.status(404).json({ message: "No orders found for this date range" });
      }

      let totalQuantity = 0;
      let totalPrice = 0;

      orders.forEach((order) => {
        order.items.forEach((item) => {
          totalQuantity += item.quantity;
        });
        totalPrice += order.totalPrice;
      });


      const doc = new PDFDocument({ margin: 20, size: "A4" });

      let filename = "sales_report.pdf";
      filename = encodeURIComponent(filename);
      res.setHeader("content-disposition", `attachment; filename="${filename}"`);
      res.setHeader("content-type", "application/pdf");


      const logoPath = './public/uploads/profile/logo.png'
      const logoImage = fs.readFileSync(logoPath);

      doc.image(logoImage, {fit: [150, 150], align: 'center', valign: 'top'})

      doc.moveDown();

      doc.fontSize(24).text("Sales Report", { align: "center" }).moveDown();

      // Define column widths and starting positions
      const margins = { left: 20, top: 100 };
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
      const maxRowsPerPage = 20;

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
        yPosition = margins.top + rowHeight + 10;
      };

      // Draw a line before each order details
      const drawSeparatorLine = () => {
        doc.strokeColor("black").lineWidth(1);
        doc
          .moveTo(margins.left, yPosition)
          .lineTo(margins.left + Object.values(columnWidths).reduce((acc, width) => acc + width, 0), yPosition)
          .stroke();
        yPosition += 5;
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
          const productNames = order.items.map((item) => `${item.productId.name} (Qty: ${item.quantity})`).join(", ");
          const customerName = order.customerId ? `${order.customerId.name}` : "";

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
            `${order.totalPrice.toFixed(2)}`,
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

      // Draw footer with total quantity and total price
      const drawFooter = () => {
        // Check if we need to add a new page
        if (yPosition > doc.page.height - margins.top - rowHeight * 2) {
          doc.addPage();
          yPosition = margins.top + rowHeight * 2;
        }

        // Draw a line above the footer
        doc.strokeColor("black").lineWidth(1);
        doc
          .moveTo(margins.left, yPosition)
          .lineTo(margins.left + Object.values(columnWidths).reduce((acc, width) => acc + width, 0), yPosition)
          .stroke();

        yPosition += 10;

        // Footer text
        doc.fontSize(12).font("Helvetica-Bold");

        // Total Quantity
        doc.text(`Total Quantity: ${totalQuantity}`, margins.left, yPosition, { align: "left" });

        // Total Price
        doc.text(`Total Price: ${totalPrice.toFixed(2)}`, margins.left + 300, yPosition, { align: "left" });

        yPosition += rowHeight;
      };

      // Draw header and rows
      drawHeader();
      drawRows();

      drawFooter();

      // Sending the PDF
      doc.pipe(res);
      doc.end();
    } catch (err) {
      console.log(err);
      res.status(500).send("Internal Server Error");
    }
  },
};
