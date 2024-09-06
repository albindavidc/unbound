const Coupon = require("../../models/couponSchema");

module.exports = {
  getCouponList: async (req, res) => {
    try {
      const couponData = await Coupon.find();

      res.render("admin/coupons", { coup: couponData });
    } catch (error) {
      console.error("Error fetching the coupons from DB", error);
      res.redirect("/pageerror");
    }
  },

  addCoupons: async (req, res) => {
    const { couponCode, couponDescription, couponRateOfDiscount, couponMinPurchaseAmount, couponMaxDiscount } = req.body;

    try {
      const existingCoupon = await Coupon.findOne({ couponCode });
      if (existingCoupon) {
        return res.status(400).json({ error: "Coupon already exists" });
      }

      const newCoupon = new Coupon({
        code: couponCode,
        description: couponDescription,
        rateOfDiscount: couponRateOfDiscount,
        minPurchaseAmount: couponMinPurchaseAmount,
        maximumDiscount: couponMaxDiscount,
      });
      await newCoupon.save();
      return res.json({ success: true, message: "Coupon added successfully" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  editCoupon: async (req, res) => {
    const { couponCode, couponDescription, couponRateOfDiscount, couponMinPurchaseAmount, couponMaxDiscount } = req.body;

    try {
      const updatedCoupon = await Coupon.findOneAndUpdate(
        { code: couponCode },
        {
          description: couponDescription,
          rateOfDiscount: couponRateOfDiscount,
          minPurchaseAmount: couponMinPurchaseAmount,
          maximumDiscount: couponMaxDiscount,
        },
        { new: true } 
      );

      if (updatedCoupon) {
        return res.json({ success: true, message: "Coupon added successfully" });
      } else {
        return res.json({ success: false, message: "The coupon is not updated" });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  deleteCoupon: async (req, res) => {
    try {
      const { couponCode } = req.body;
      console.log("this is coupon id", couponCode);

      const deleteCouponFromDB = await Coupon.findOneAndDelete({ code: couponCode });
      if (deleteCouponFromDB) {
        return res.json({ success: true, message: "Coupon deleted successfully" });
      } else {
        return res.json({ success: false, message: "Coupon deletion incomplete" });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
};
