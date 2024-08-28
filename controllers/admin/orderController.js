const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const Color = require("../../models/attributes/colorSchema");
const Size = require("../../models/attributes/sizeSchema");

const { prependListener } = require("../../models/userSchema");

module.exports = {
  getOrderList: async (req, res) => {
    try {
      // Fetch all orders with related product and user details
      let orderDetails = await Order.find()
        .populate({
          path: "customerId",
          select: "name email", // Select the fields you want from the user
        })
        .populate({
          path: "items.productId",
          select: "name price", // Select the fields you want from the product
        })
        .populate({
          path: "items.color",
          select: "name", // Select the fields you want from the color
        })
        .populate({
          path: "items.size",
          select: "name", // Select the fields you want from the size
        })
        .sort({ createdAt: -1 }); // Sort by latest order

      const newOrderDetails = await Order.find();
      console.log(orderDetails.items);
      // console.log("this is orderDetails",newOrderDetails[])

      // Render the order list on the admin side
      res.render("admin/orderList", {
        orders: orderDetails,
        newOrderDetails,
      });
    } catch (error) {
      console.error("Error loading order details:", error);
      res.status(500).send("Server Error");
    }
  },

  updateDeliveryStatus: async (req, res) => {
    try {
      const { deliveryStatus, id } = req.body;

      const order = await Order.findById(id).populate("paymentStatus", "status");

      console.log("this is body", req.body);

      if (!order) {
        res.status(400).json({ error: "Order not found" });
      }

      // Update status and paymentStatus based on deliveryStatus
      switch (deliveryStatus) {
        case "Shipped":
          order.status = "Shipped";
          order.paymentStatus = "Pending";
          break;
        case "Delivered":
          order.status = "Delivered";
          order.paymentStatus = "Paid";
          break;
        case "Cancelled":
          order.status = "Cancelled";
          order.paymentStatus = "Refund";
          break;
        case "Pending":
          order.status = "Pending";
          order.paymentStatus = "Pending";
          break;
        default:
          return res.status(400).json({ error: "Invalid delivery status" });
      }

      await order.save();
      res.json({ message: "Order updated successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal SErver Error" });
    }
  },
};
