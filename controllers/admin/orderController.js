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
        console.log(orderDetails.items)
        // console.log("this is orderDetails",newOrderDetails[])



      // Render the order list on the admin side
      res.render("admin/orderList", {
        orders: orderDetails,
      });
    } catch (error) {
      console.error("Error loading order details:", error);
      res.status(500).send("Server Error");
    }
  },
};
