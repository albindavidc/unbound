const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const Color = require("../../models/attributes/colorSchema");
const Size = require("../../models/attributes/sizeSchema");

module.exports = {
  getOrderList: async (req, res) => {
    try {
      const statuses = ["Pending", "Shipped", "Delivered", "Cancelled", "Return"];

      // Fetch and populate order details
      let orderDetails = await Order.find()
        .populate({ path: "customerId", select: "name email" })
        .populate({ path: "items.productId", select: "name price sellingPrice" })
        .populate({ path: "items.color", select: "name" })
        .populate({ path: "items.size", select: "name" })
        .sort({ createdAt: -1 });
      
      // Calculate the common status for each order
      orderDetails.forEach((order) => {
        // Extract all statuses for the items in the order
        let itemStatuses = order.items.map(item => item.status);
        
        // Determine the common status based on the item statuses
        if (itemStatuses.includes("Return")) {
          order.commonStatus = "Return";
        } else if (itemStatuses.every(status => status === "Shipped")) {
          order.commonStatus = "Shipped";
        } else if (itemStatuses.every(status => status === "Delivered")) {
          order.commonStatus = "Delivered";
        } else if (itemStatuses.every(status => status === "Cancelled")) {
          order.commonStatus = "Cancelled";
        } else {
          order.commonStatus = "Pending";
        }
        
        console.log(`Order ID: ${order._id}, Common status: ${order.commonStatus}`);
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
        case "Return":
          order.status = "Return";
          order.paymentStatus = "Refund";
          break;
        default:
          return res.status(400).json({ error: "Invalid delivery status" });
      }

      await order.save();
      res.json({success: true, message: "Order updated successfully" });

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
};
