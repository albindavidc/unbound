const Order = require("../../models/orderSchema");

module.exports = {
  getOrders: async (req, res) => {
    let userId = req.session.user;
    console.log(userId);

    let order = await Order.find({ customerId: userId }).populate({
      path: "items.productId",
      select: "name price", // Select the fields you want from the product
    });

    console.log(order);

    // Calculate canReturn and canCancel for each order
    order = order.map((order) => {
      const isDelivered = order.status === "Delivered";
      const oneWeekInMilliseconds = 7 * 24 * 60 * 60 * 1000;
      const isWithinReturnPeriod = new Date() - new Date(order.deliveredOn) <= oneWeekInMilliseconds;

      order.canReturn = isDelivered && isWithinReturnPeriod;
      // Show the cancel button if the order is not delivered
      order.canCancel = !isDelivered;
      return order;
    });

    res.render("user/orders", { order });
  },
};
