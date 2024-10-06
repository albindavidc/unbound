const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const Color = require("../../models/attributes/colorSchema");
const Size = require("../../models/attributes/sizeSchema");
const Customize = require("../../models/customizedProduct");

module.exports = {
  getOrderList: async (req, res) => {
    try {
      const statuses = ["Pending", "Shipped", "Delivered", "Cancelled", "Return"];

      let perPage = 10;
      let page = parseInt(req.query.page) || 1;

      let orderDetails = await Order.find()
        .populate({ path: "customerId", select: "name email" })
        .populate({ path: "items.productId", select: "name price sellingPrice" })
        .populate({ path: "items.color", select: "name" })
        .populate({ path: "items.size", select: "name" })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .sort({ createdAt: -1 })
        .exec();

      orderDetails.forEach((order) => {


        let itemStatuses = order.items.map((item) => item.status);

        if (itemStatuses.includes("Return")) {
          order.commonStatus = "Return";
        } else if (itemStatuses.every((status) => status === "Shipped")) {
          order.commonStatus = "Shipped";
        } else if (itemStatuses.every((status) => status === "Delivered")) {
          order.commonStatus = "Delivered";
        } else if (itemStatuses.every((status) => status === "Cancelled")) {
          order.commonStatus = "Cancelled";
        } else {
          order.commonStatus = "Pending";
        }
        console.log(`Order ID: ${order._id}, Common status: ${order.commonStatus}`);
      });

      const count = await Order.countDocuments();

      const nextPage = parseInt(page) + 1;
      const totalPages = Math.ceil(count / perPage);
      const hasPrevPage = page > 1;
      const hasNextPage = page < totalPages;

      res.render("admin/orderList", {
        orders: orderDetails,
        statuses,

        pagination: orderDetails,
        currentPage: page,
        perPage,
        nextPage,
        hasPrevPage,
        hasNextPage,
        totalPages,
      });
    } catch (error) {
      console.error("Error loading order details:", error);
      res.status(500).send("Server Error");
    }
  },

  updateDeliveryStatus: async (req, res) => {
    try {
      const { orderId } = req.params;
      const { itemIndex, status } = req.body;

      // Update the status of all items in the order
      // await Order.updateOne({ _id: id }, { $set: { "items.$[].status": status, status } });

      const order = await Order.findById(orderId);
      order.items[itemIndex].status = status;

      console.log("this is order", order);

      switch (status) {
        case "Shipped":
          order.items[itemIndex].status = "Shipped";
          order.items[itemIndex].paymentStatus = "Pending";
          break;
        case "Delivered":
          order.items[itemIndex].status = "Delivered";
          order.items[itemIndex].paymentStatus = "Paid";
          order.items[itemIndex].deliveredOn = new Date();
          break;
        case "Cancelled":
          order.items[itemIndex].status = "Cancelled";
          order.items[itemIndex].paymentStatus = "Refund";
          break;
        case "Pending":
          order.items[itemIndex].status = "Pending";
          order.items[itemIndex].paymentStatus = "Pending";
          break;
        case "Return":
          order.items[itemIndex].status = "Return";
          order.items[itemIndex].paymentStatus = "Refund";
          break;
        default:
          return res.status(400).json({ error: "Invalid delivery status" });
      }

      await order.save();
      res.json({ success: true, message: "Order updated successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },

  productCustomized: async (req, res) => {
    const orderId = req.params.id;
    const order = await Order.findById(orderId);
    const userId = order.customerId;
    let  customDesign = await Customize.findOne({ userId: userId });

    const checkProductId = customDesign.products.find((customItem) => {
      return order.items.some((orderItem) => customItem.productId.toString() === orderItem.productId.toString());
    });

    if (!checkProductId) {
      return res.status(404).send("No matching custom design for this product.");
    }
    
    const products = await Product.findOne({_id: checkProductId.productId})
    console.log(checkProductId, "this is product id")
    
    customDesign = checkProductId
    res.render("admin/productCustomizeDownload", {
      order,
      customDesign,
      checkProductId,
      products
    });
  },
};
