const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
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
        select: "name price", // Select the fields you want from the product
      })
      .populate("items.color items.size shippingAddress")
      .sort({ createdAt: -1 })
      .skip(perPage * page - perPage)
      .limit(perPage)
      .exec();

    console.log(order);
    const product = await Product.find({});

    // Calculate canReturn and canCancel for each order
    order = order.map((order) => {
      const isDelivered = order.status === "Delivered";
      const isCancelled = order.status === "Cancelled";
      const oneWeekInMilliseconds = 7 * 24 * 60 * 60 * 1000;
      const isWithinReturnPeriod = new Date() - new Date(order.deliveredOn) <= oneWeekInMilliseconds;

      order.canReturn = isDelivered && isWithinReturnPeriod;
      order.canCancel = !isDelivered && !isCancelled;
      return order;
    });

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
          select: "name price", // Select the fields you want from the product
        })
        .populate("items.color items.size shippingAddress _id");

      if (order.length > 0) {
        console.log("This is the first order ID on this page:", order[0]._id);
      } else {
        console.log("No orders found.");
      }

      // Calculate canReturn and canCancel for each order
      order = order.map((order) => {
        const isDelivered = order.status === "Delivered";
        const isCancelled = order.status === "Cancelled";
        const oneWeekInMilliseconds = 7 * 24 * 60 * 60 * 1000;
        const isWithinReturnPeriod = new Date() - new Date(order.deliveredOn) <= oneWeekInMilliseconds;

        order.canReturn = isDelivered && isWithinReturnPeriod;
        order.canCancel = !isDelivered && !isCancelled;
        return order;
      });

      res.render("user/order", { order, orderId, user: req.session.user });

    } catch (error) {
      console.error("Error fetching order details:", error);
      res.status(500).send("Server Error");
    }
  },

  returnOrder: async (req, res) => {
    let orderId = req.params.orderId;

    console.log("this is order id", orderId);
    try {
      const result = await Order.findByIdAndUpdate(
        orderId, 
        { 
          $set: { 
            "items.$[].status": "Return",
            status: "Return",
            paymentStatus: "Refund"        // Update the payment status to "Refund"
          } 
        },
        { new: true } // This option ensures the updated document is returned
      );

      if (result) {
        res.status(200).json({ success: true, message: "Order returned successfully" });
      } else {
        res.status(404).json({ success: false, message: "Order not found" });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // cancelOrder: async (req,res) =>{
  //   let orderId = req.params.id;
  //   try {
  //     const result = await Order.findByIdAndUpdate(orderId, )
  //   } catch (error) {

  //   }
  // }
};
