// couponController.js
const Coupon = require("../../models/couponSchema");
const Cart = require("../../models/cartSchema");

module.exports = {
  // Apply coupon
  applyCoupon: async (req, res) => {
    try {
      let { code } = req.body;
      code = code.trim().toUpperCase();

      const couponCode = await Coupon.findOne({ code: code });

      if (!couponCode) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "Coupon not found." });
      }

      const currentDate = new Date();
      const expirationDate = new Date(couponCode.expiringDate);

      if (currentDate > expirationDate || !couponCode.isActive) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Coupon is expired or inactive." });
      }

      const userCart = await Cart.findOne({ userId: req.session.user });
      if (!userCart) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "User cart not found." });
      }

      // Check if the cart total is greater than the minimum purchase amount
      const totalPrice = userCart.totalPrice || 0;
      if (totalPrice < couponCode.minPurchaseAmount) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "Cart total is less than the minimum purchase amount for this coupon.",
        });
      }

      if (userCart.coupon && userCart.coupon.toString() === couponCode._id.toString()) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Coupon is already in use." });
      }

      let discountAmount = totalPrice * (couponCode.rateOfDiscount / 100);

      if (discountAmount > couponCode.maximumDiscount) {
        discountAmount = couponCode.maximumDiscount;
      }

      userCart.couponDiscount = discountAmount;
      userCart.coupon = couponCode._id;
      await userCart.save();

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Coupon is valid and applied!",
        coupon: couponCode,
        discountAmount,
      });
    } catch (error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "An error occurred." });
    }
  },

  // Remove Coupon
  removeCoupon: async (req, res) => {
    try {
      const cart = await Cart.findOne({ userId: req.session.user });

      if (!cart) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Cart not found" });
      }

      cart.coupon = undefined;
      cart.couponDiscount = 0;

      await cart.save();
      return res.status(HTTP_STATUS.OK).json({ message: "Coupon removed successfully", newGrandTotal: cart.payable });
    } catch (error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: "Internal server error" });
    }
  },
};
