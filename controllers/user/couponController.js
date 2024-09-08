const Coupon = require("../../models/couponSchema");
const Cart = require("../../models/cartSchema");

module.exports = {applyCoupon: async (req, res) => {
    try {
      let { code } = req.body;
      console.log(req.body);
      code = code.trim().toUpperCase();

      const couponCode = await Coupon.findOne({ code: code });

      if (!couponCode) {
        return res
          .status(404)
          .json({ success: false, message: "Coupon not found." });
      }

      // // Check if the coupon is used by the user
      // const userHasUsedCoupon = couponCode.usedBy.some((user) =>
      //   user.userId.equals(req.user.id)
      // );

      // if (userHasUsedCoupon) {
      //   return res
      //     .status(400)
      //     .json({
      //       success: false,
      //       message: "Coupon has already been used by this user.",
      //     });
      // }

      const currentDate = new Date();
      const expirationDate = new Date(couponCode.expiringDate);

      if (currentDate > expirationDate || !couponCode.isActive) {
        return res
          .status(400)
          .json({ success: false, message: "Coupon is expired or inactive." });
      }

      const userCart = await Cart.findOne({ userId: req.session.user });
      if (!userCart) {
        return res
          .status(404)
          .json({ success: false, message: "User cart not found." });
      }

      // Check if the cart total is greater than the minimum purchase amount
      const totalPrice = userCart.totalPrice || 0;
      if (totalPrice < couponCode.minPurchaseAmount) {
        return res.status(400).json({
          success: false,
          message:
            "Cart total is less than the minimum purchase amount for this coupon.",
        });
      }

      // Check if the coupon is already applied
      if (
        userCart.coupon &&
        userCart.coupon.toString() === couponCode._id.toString()
      ) {
        return res
          .status(400)
          .json({ success: false, message: "Coupon is already in use." });
      }

      // Calculate the discount amount based on the coupon's rateOfDiscount
      let discountAmount = totalPrice * (couponCode.rateOfDiscount / 100);

      // Check if the discount amount is greater than the maximum discount
      if (discountAmount > couponCode.maximumDiscount) {
        discountAmount = couponCode.maximumDiscount;
      }

      userCart.couponDiscount = discountAmount;
      userCart.coupon = couponCode._id;
      await userCart.save();

      return res.status(200).json({
        success: true,
        message: "Coupon is valid and applied!",
        coupon: couponCode,
        discountAmount,
      });
    } catch (error) {
      console.log(error);
      return res
        .status(500)
        .json({ success: false, message: "An error occurred." });
    }
  },
  removeCoupon: async (req, res) => {
    try {
      const cart = await Cart.findOne({ userId: req.session.user });

      console.log(cart);
      if (!cart) {
        return res.status(404).json({ message: "Cart not found" });
      }

      cart.coupon = undefined;
      cart.couponDiscount = 0; 

      await cart.save();
      return res.status(200).json({ message: "Coupon removed successfully" });
    } catch (error) {
      console.error("Error removing coupon:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

};
