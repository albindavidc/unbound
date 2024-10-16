// orderController.js

const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const Wallet = require("../../models/walletSchema");
const User = require("../../models/userSchema");
const Payment = require("../../models/paymentSchema");

const fs = require("fs");
const Razorpay = require("razorpay");
const crypto = require("crypto");

const path = require("path");
const PDFDocument = require("pdfkit");

const { loadProductDetails } = require("./productController");

module.exports = {
  // Get Orders
  getOrders: async (req, res) => {
    let userId = req.session.user;
    const product = await Product.find({});

    let perPage = 10;
    let currentPage = parseInt(req.query.page) || 1;

    const order = await Order.find({ customerId: userId })
      .populate({
        path: "items.productId",
        select: "name price primaryImages secondaryImages", // Select the fields you want from the product
      })
      .populate("items.color items.size shippingAddress")

      .skip((currentPage - 1) * perPage)
      .limit(perPage)
      .sort({ createdAt: -1 })
      .exec();

    const count = await Order.countDocuments({ customerId: userId });
    const nextPage = parseInt(currentPage) + 1;
    const totalPages = Math.ceil(count / perPage);
    const hasPrevPage = currentPage > 1;
    const hasNextPage = currentPage < totalPages;

    res.render("user/orders", {
      order,
      user: req.session.user,
      product,

      pagination: order,
      currentPage,
      perPage,
      nextPage,
      hasPrevPage,
      hasNextPage,
      totalPages,

      currentRoute: "/user/orders/",
    });
  },

  // Get Order
  getOrder: async (req, res) => {
    try {
      const orderId = req.params.orderId;

      const userId = req.session.user;

      let order = await Order.find({ customerId: userId })
        .populate({
          path: "items.productId",
          select: "name price primaryImages secondaryImages",
        })
        .populate("items.color items.size shippingAddress _id items.orderID")
        .populate("items.productId.primaryImages")
        .populate({
          path: "items.productId",
          populate: {
            path: "ratings",
          },
        })
        .populate("customerId");

      const user = await User.findById(userId);
      const orders = await Order.findById(orderId);
      const payment = await Payment.find({ orderId: order._id });

      let totalPrice
      let newOrderId
      let createdDate

      order.forEach(item =>{
        totalPrice = item.totalPrice
        newOrderId = item._id
        createdDate = new Date(item.createdAt).toLocaleDateString()
      })

      console.log(totalPrice, newOrderId, createdDate, "this is the total price")

      res.render("user/order", { totalPrice, newOrderId, createdDate, order, orderId, user: req.session.user, user, orders, payment });
    } catch (error) {
      res.status(500).send("Server Error");
    }
  },

  continueOrder: async (req, res) => {
    var instance = new Razorpay({
      key_id: process.env.RAZ_KEY_ID,
      key_secret: process.env.RAZ_KEY_SECRET,
    });

    const createRazorpayOrder = async (order_id, total) => {
      let options = {
        amount: total * 100,
        currency: "INR",
        receipt: order_id.toString(),
      };
      const order = await instance.orders.create(options);
      return order;
    };

    const { order } = req.body;
    const orderId = order._id;
    const userId = req.session.user;

    const user = await User.findById(userId);
    const orders = await Order.findById(orderId);

    let total = parseInt(orders.totalPrice);
    const RazorpayOrder = await createRazorpayOrder(orderId, total).then((order) => order);

    const timestamp = RazorpayOrder.created_at;
    const date = new Date(timestamp * 1000);

    const formattedDate = date.toISOString();

    let payment = new Payment({
      paymentId: RazorpayOrder.id,
      amount: parseInt(RazorpayOrder.amount) / 100,
      currency: RazorpayOrder.currency,
      orderId: orderId,
      status: RazorpayOrder.status,
      createdAt: formattedDate,
    });
    await payment.save();
    return res.json({
      status: true,
      order: RazorpayOrder,
      user,
    });
  },

  // Update Order
  updateOrder: async (req, res) => {
    const { orderId } = req.params;
    const { action, cancelReason, returnReason, orderCancelRefundMethod, orderReturnRefundMethod } = req.body;

    try {
      let result;

      if (action === "return") {
        if (orderReturnRefundMethod === "RefundToBankAccount") {
          result = await Order.findOneAndUpdate(
            {
              "items.orderID": orderId,
            },
            {
              $set: {
                "items.$.status": "Return",
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

          const wallet = await Wallet.findOne({ userId: req.session.user });

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

          const wallet = await Wallet.findOne({ userId: req.session.user });

          if (wallet && isPending === false) {
            const amount = wallet.balance + itemTotal;

            // Update wallet balance and append a new transaction
            wallet.balance = Math.round(amount);
            wallet.transactions.push({
              date: new Date(),
              amount: Math.round(itemTotal),
              message: "Product Refund",
              type: "Credit",
            });

            await wallet.save();

            result = await Order.findOneAndUpdate(
              {
                "items.orderID": orderId,
              },
              {
                $set: {
                  "items.$.status": "Cancelled",
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
                "items.orderID": orderId,
              },
              {
                $set: {
                  "items.$.status": "Cancelled",
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
        res.status(400).json({ message: "Detailed error message" });
      }

      res.status(200).json({ success: true, message: `Order ${action}ed successfully` });
    } catch (error) {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Get PDF
  getInvoicePdf: async (req, res) => {
    try {
      const orderId = req.query.orderId;
      if (!orderId) {
        return res.status(400).json({ success: false, message: "Order ID is missing" });
      }

      const order = await Order.findById(orderId).populate("items.productId");

      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }

      let totalQuantity = 0;
      let totalPrice = order.totalPrice;

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

      const logoPath = `./public/uploads/profile/logo.png`;
      const logoImage = fs.readFileSync(logoPath);

      doc.image(logoImage, { fit: [100, 100], align: "center", valign: "top" });
      doc.moveDown();

      // Header
      doc.fontSize(24).text("Order Invoice", { align: "center" }).moveDown();

      const margin = { left: 20, top: 100, bottom: 50 };
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
        doc.moveTo(margin.left, yPosition).lineTo(550, yPosition).stroke();

        yPosition += 20;

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
        yPosition += 100;
        doc.fontSize(12).font("Helvetica-Bold");

        doc
          .moveTo(margin.left, yPosition - 10)
          .lineTo(margin.left + 500, yPosition - 10)
          .stroke();

        doc.text(`Total Quantity: ${totalQuantity}`, margin.left, yPosition);
        doc.text(`Total Price: ${totalPrice.toFixed(2)}`, margin.left + 200, yPosition);

        yPosition += 30;

        doc
          .moveTo(margin.left, yPosition - 10)
          .lineTo(margin.left + 500, yPosition - 10)
          .stroke();

        yPosition += 20;

        // Shipping Address details
        doc.fontSize(10).font("Helvetica");
        doc.text(`Shipping Address:`, margin.left, yPosition);

        yPosition += 15;
        doc.text(`Name: ${order.shippingAddress.name}`, margin.left, yPosition);

        yPosition += 15;
        doc.text(`House Name: ${order.shippingAddress.houseName}`, margin.left, yPosition);

        yPosition += 15;
        doc.text(`Locality: ${order.shippingAddress.locality}`, margin.left, yPosition);

        yPosition += 15;
        doc.text(`Area/Street: ${order.shippingAddress.areaStreet}`, margin.left, yPosition);

        yPosition += 15;
        doc.text(`Phone: ${order.shippingAddress.phone}`, margin.left, yPosition);

        yPosition += 15;
        doc.text(`Zipcode: ${order.shippingAddress.zipcode}`, margin.left, yPosition);

        yPosition += 15;
        doc.text(`State: ${order.shippingAddress.state}`, margin.left, yPosition);

        yPosition += 15;
        doc.text(`Landmark: ${order.shippingAddress.landmark}`, margin.left, yPosition);

        yPosition += 30;
      };

      drawFooter();

      // Pipe the PDF to response
      doc.pipe(res);
      doc.end();
    } catch (error) {
      console.log(error, "this is fantastic error");
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Submit Review
  submitReview: async (req, res) => {
    try {
      const { productId, orderId } = req.params;
      const { rating, review } = req.body;

      if (!rating || !review) {
        return res.status(400).json({ success: false, message: "Rating and review are required" });
      }

      const product = await Product.findById(productId);
      const userId = req.session.user;

      if (!product) {
        return res.status(404).json({ success: false, message: "Product not found" });
      }

      // First, check if a rating already exists for the user and order
      const existingRating = product.ratings.find(
        (rating) => rating.user.toString() === userId.toString() && rating.orderId.toString() === orderId.toString()
      );

      if (existingRating) {
        // If rating exists, update it using an array filter
        await Product.findOneAndUpdate(
          { _id: product._id, "ratings.user": userId, "ratings.orderId": orderId },
          {
            $set: {
              "ratings.$.rating": parseInt(rating), // Target the existing rating and update fields as needed
              "ratings.$.review": review,
              "ratings.$.createdAt": new Date(),
              // Add any other fields you want to update, e.g. rating, review, etc.
            },
          },
          { new: true, upsert: true }
        );
      } else {
        // If rating doesn't exist, push a new one
        await Product.findOneAndUpdate(
          { _id: product._id },
          {
            $push: {
              ratings: {
                rating: parseInt(rating),
                review: review,
                createdAt: new Date(),
              },
            },
          },
          { new: true, upsert: true }
        );
      }

      res.json({ success: true, message: "Review added successfully!" });
    } catch (error) {
      console.log(error, "this is error")
      res.status(500).json({ success: false, message: "Server error. Please try again later" });
    }
  },
};
