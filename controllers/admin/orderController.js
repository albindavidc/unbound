const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const Color = require("../../models/attributes/colorSchema");
const Size = require("../../models/attributes/sizeSchema");

module.exports = {
  getOrderList: async (req, res) => {
    try {
      // Fetch all orders with related product and user details
      let orderDetails = await Order.find()
        .populate({
          path: "customerId",
          select: "name email", 
        })
        .populate({
          path: "items.productId",
          select: "name price", 
        })
        .populate({
          path: "items.color",
          select: "name", 
        })
        .populate({
          path: "items.size",
          select: "name",
        })
        .sort({ createdAt: -1 });

      const statuses = ["Pending", "Shipped", "Delivered", "Cancelled"];

      // Calculate the common status for each order
      orderDetails.forEach((order) => {
        let commonStatus = order.items[0].status;

        const allSameStatus = order.items.every((item) => item.status === commonStatus);

        if (!allSameStatus) {
          commonStatus = "Pending"; 
        }
        order.commonStatus = commonStatus;
      });


     
      res.render("admin/orderList", {
        orders: orderDetails,
        statuses,
      });
    } catch (error) {
      console.error("Error loading order details:", error);
      res.status(500).send("Server Error");
    }
  },

  updateDeliveryStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // Update the status of all items in the order
      await Order.updateOne({ _id: id }, { $set: { "items.$[].status": status, status } });

      const order = await Order.findById(id);

      if (!order) {
        return res.status(400).json({ error: "Order not found" });
      }

      // Update status and paymentStatus based on deliveryStatus
      switch (status) {
        case "Shipped":
          order.status = "Shipped";
          order.paymentStatus = "Pending";
          break;
        case "Delivered":
          order.status = "Delivered";
          order.paymentStatus = "Paid";
          order.deliveredOn = new Date();
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
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
};
