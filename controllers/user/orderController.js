const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const Wallet = require("../../models/walletSchema");
const path = require("path");
const PDFDocument = require("pdfkit");

const { loadProductDetails } = require("./productController");

module.exports = {
  getOrders: async (req, res) => {
    let userId = req.session.user;
    console.log(userId);

    let perPage = 4;
    let page = req.query.page || 1;

    const count = await Order.countDocuments({ customerId: userId });
    const nextPage = parseInt(page) + 1;
    const hasNextPage = nextPage <= Math.ceil(count / perPage);

    let order = await Order.find({ customerId: userId })
      .populate({
        path: "items.productId",
        select: "name price primaryImages secondaryImages", // Select the fields you want from the product
      })
      .populate("items.color items.size shippingAddress")
      .sort({ createdAt: -1 })
      .skip(perPage * page - perPage)
      .limit(perPage)
      .exec();

    console.log(order);
    const product = await Product.find({});

    // // Calculate canReturn and canCancel for each order
    // order = order.map((order) => {
    //   const isDelivered = order.status === "Delivered";
    //   const isCancelled = order.status === "Cancelled";
    //   const oneWeekInMilliseconds = 7 * 24 * 60 * 60 * 1000;
    //   const isWithinReturnPeriod = new Date() - new Date(order.deliveredOn) <= oneWeekInMilliseconds;

    //   order.canReturn = isDelivered && isWithinReturnPeriod;
    //   order.canCancel = !isDelivered && !isCancelled;
    //   return order;
    // });

    res.render("user/orders", {
      order,
      user: req.session.user,
      product,
      current: page,
      pages: Math.ceil(count / perPage),
      nextPage: hasNextPage ? nextPage : null,
      currentRoute: "/user/orders/",
    });
  },

  getOrder: async (req, res) => {
    try {
      const orderId = req.params.orderId;

      const userId = req.session.user;

      let order = await Order.find({ customerId: userId })
        .populate({
          path: "items.productId",
          select: "name price primaryImages secondaryImages", // Select specific fields if needed
        })
        .populate("items.color items.size shippingAddress _id items.orderID")
        .populate("items.productId.primaryImages");

      if (order.length > 0) {
        console.log("This is the first order ID on this page:", order[0]._id);
      } else {
        console.log("No orders found.");
      }

      // Example of accessing the first orderID
      console.log("This is the first item's orderID:", order[0].items[0].orderID);

      console.log("this is orderId");
      res.render("user/order", { order, orderId, user: req.session.user });
    } catch (error) {
      console.error("Error fetching order details:", error);
      res.status(500).send("Server Error");
    }
  },
  updateOrder: async (req, res) => {
    const { orderId } = req.params;
    const { action, cancelReason, returnReason, orderCancelRefundMethod, orderReturnRefundMethod } = req.body;

    console.log("Received orderId:", orderId, action); // Debugging the received orderId

    try {
      let result;

      if (action === "return") {
        if (orderReturnRefundMethod === "RefundToBankAccount") {
          result = await Order.findOneAndUpdate(
            {
              "items.orderID": orderId, // Corrected to search by the orderID inside items array
            },
            {
              $set: {
                "items.$.status": "Return", // Use $ to update the matched element in the array
                "items.$.paymentStatus": "Refund",
                "items.$.returnReason": returnReason,
                "items.$.returnRefundMethod": "Refund to Bank Account",
                "items.$.returnedOn": Date.now(),
              },
            },
            { new: true }
          );
        } else if (orderReturnRefundMethod === "RefundToWallet") {
          const order = await Order.findOne({
            items: { $elemMatch: { orderID: orderId } },
          });
          console.log("this is the ordercanel through wallet in backend", order);

          let isPending = false;
          let itemTotal = 0;

          order.items.forEach((item) => {
            if (item.orderID === orderId && item.paymentStatus === "Pending") {
              isPending = true;
            }

            if (item.orderID === orderId) {
              itemTotal = item.itemTotal; // Only sum the specific item's total
            }
          });

          console.log("this is item total in the backend", itemTotal);
          console.log(itemTotal, "this is item total from the backend");

          const wallet = await Wallet.findOne({ userId: req.session.user });
          console.log("Wallet balance", wallet.balance);

          if (wallet) {
            const amount = wallet.balance + itemTotal;

            // Update wallet balance and append a new transaction
            wallet.balance = Math.round(amount);
            wallet.transactions.push({
              date: new Date(),
              amount: Math.round(itemTotal), // Only round the new transaction
              message: "Product Refund",
              type: "Credit",
            });

            await wallet.save();
          }

          result = await Order.findOneAndUpdate(
            {
              "items.orderID": orderId, // Corrected to search by the orderID inside items array
            },
            {
              $set: {
                "items.$.status": "Return", // Use $ to update the matched element in the array
                "items.$.paymentStatus": "Refund",
                "items.$.returnReason": returnReason,
                "items.$.returnRefundMethod": "Refund to Bank Account",
                "items.$.returnedOn": Date.now(),
              },
            },
            { new: true }
          );
        }
      } else if (action === "cancel") {
        if (orderCancelRefundMethod === "RefundToBankAccount") {
          result = await Order.findOneAndUpdate(
            {
              "items.orderID": orderId, // Corrected to search by the orderID inside items array
            },
            {
              $set: {
                "items.$.status": "Cancelled", // Use $ to update the matched element in the array
                "items.$.paymentStatus": "Refund",
                "items.$.cancelReason": cancelReason,
                "items.$.cancelRefundMethod": "Refund to Wallet",
                "items.$.cancelledOn": Date.now(),
              },
            },
            { new: true }
          );
        } else if (orderCancelRefundMethod === "RefundToWallet") {
          const order = await Order.findOne({
            items: { $elemMatch: { orderID: orderId } },
          });
          console.log("this is the ordercanel through wallet in backend", order);

          //Pending products don't Refund
          let isPending = false;
          let itemTotal = 0;

          order.items.forEach((item) => {
            if (item.orderID === orderId && item.paymentStatus === "Pending") {
              isPending = true;
            }

            if (item.orderID === orderId) {
              itemTotal = item.itemTotal;
            }
          });

          console.log("this is pending", isPending, itemTotal);

          const wallet = await Wallet.findOne({ userId: req.session.user });
          // console.log("Wallet balance", wallet.balance);

          if (wallet && isPending === false) {
            const amount = wallet.balance + itemTotal;

            // Update wallet balance and append a new transaction
            wallet.balance = Math.round(amount);
            wallet.transactions.push({
              date: new Date(),
              amount: Math.round(itemTotal), // Only round the new transaction
              message: "Product Refund",
              type: "Credit",
            });

            await wallet.save();

            result = await Order.findOneAndUpdate(
              {
                "items.orderID": orderId, // Corrected to search by the orderID inside items array
              },
              {
                $set: {
                  "items.$.status": "Cancelled", // Use $ to update the matched element in the array
                  "items.$.paymentStatus": "Refund",
                  "items.$.cancelReason": cancelReason,
                  "items.$.cancelRefundMethod": "Refund to Wallet",
                  "items.$.cancelledOn": Date.now(),
                },
              },
              { new: true }
            );
          } else {
            result = await Order.findOneAndUpdate(
              {
                "items.orderID": orderId, // Corrected to search by the orderID inside items array
              },
              {
                $set: {
                  "items.$.status": "Cancelled", // Use $ to update the matched element in the array
                  "items.$.paymentStatus": "Refund",
                  "items.$.cancelReason": cancelReason,
                  "items.$.cancelledOn": Date.now(),
                },
              },
              { new: true }
            );
          }
        }
      }

      if (!result) {
        console.log("Order not found");
        res.status(400).json({ message: "Detailed error message" });
      } else {
        console.log("Updated order:", result);
      }

      res.status(200).json({ success: true, message: `Order ${action}ed successfully` });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  getInvoicePdf: async (req, res) => {
    try {
      const orderId = req.query.orderId;
      if (!orderId) {
        return res.status(400).json({ success: false, message: "Order ID is missing" });
      }

      // Find the order and populate the product details for each item
      const order = await Order.findById(orderId).populate("items.productId");

      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }

      let totalQuantity = 0;
      let totalPrice = order.totalPrice;

      // Calculate total quantity
      if (Array.isArray(order.items)) {
        
        order.items.forEach((item) => {
          totalQuantity += item.quantity;
        });
      }

      // Create the PDF document
      const doc = new PDFDocument({ margin: 20, size: "A5" });
      let filename = "Order_Invoice.pdf";
      filename = encodeURIComponent(filename);
      res.setHeader("Content-disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-type", "application/pdf");

      // Header
      doc.fontSize(15).text("Order Invoice", { align: "center" }).moveDown();

      const margin = { left: 20, top: 100, bottom: 100};
      const columnWidths = {
        date: 80,
        products: 150,
        totalAmount: 100,
        paymentMethod: 80,
      };
      const rowHeight = 30;
      let yPosition = margin.top;

      // Draw Header
      const drawHeader = () => {
        doc.fontSize(12).font("Helvetica-Bold");
        doc.text("Date", margin.left, yPosition);
        doc.text("Products", margin.left + columnWidths.date, yPosition);
        doc.text("Total Amount", margin.left + columnWidths.date + columnWidths.products, yPosition);
        doc.text("Payment Method", margin.left + columnWidths.date + columnWidths.products + columnWidths.totalAmount, yPosition);
        yPosition += rowHeight;

        // Line under header
        doc.moveTo(margin.left, yPosition).lineTo(550, yPosition).stroke();
        yPosition += 10;
      };

      drawHeader();

      // Draw Rows
      order.items.forEach((item) => {
        const orderDate = new Date(order.createdAt).toISOString().split("T")[0];
        const productName = item.productId.name;

        // Check if we need to add a new page
        if (yPosition > doc.page.height - 100) {
          doc.addPage();
          yPosition = margin.top;
          drawHeader();
        }

        // Order date
        doc.fontSize(10).font("Helvetica");
        doc.text(orderDate, margin.left, yPosition);

        // Product names
        doc.text(productName + ` (Qty: ${item.quantity})`, margin.left + columnWidths.date, yPosition);

        // Total amount
        doc.text(item.itemTotal.toFixed(2), margin.left + columnWidths.date + columnWidths.products, yPosition);

        // Payment method
        doc.text(order.paymentMethod, margin.left + columnWidths.date + columnWidths.products + columnWidths.totalAmount, yPosition);

        yPosition += rowHeight;
      });

      // Footer
      const drawFooter = () => {
        yPosition += 200; // Move down
        doc.fontSize(12).font("Helvetica-Bold");
        doc.text(`Total Quantity: ${totalQuantity}`, margin.left, yPosition);
        doc.text(`Total Price: ${totalPrice.toFixed(2)}`, margin.left + 200, yPosition);
      };

      drawFooter();

      // Pipe the PDF to response
      doc.pipe(res);
      doc.end();

      console.log(PDFDocument, "THIS IS PDF DOCUMENT", order)
    } catch (error) {
      console.log(error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },
};
