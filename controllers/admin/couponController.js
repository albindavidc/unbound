// couponController.js

const Coupon = require("../../models/couponSchema");

module.exports = {
  // Get coupons
  getCouponList: async (req, res) => {
    try {
      let perPage = 10;
      let page = parseInt(req.query.page) || 1;

      const couponData = await Coupon.find()
        .skip((page - 1) * perPage)
        .limit(perPage)
        .sort({ createdAt: -1 })
        .exec();

      const count = await Coupon.countDocuments();

      const nextPage = parseInt(page) + 1;
      const totalPages = Math.ceil(count / perPage);
      const hasPrevPage = page > 1;
      const hasNextPage = page < totalPages;

      res.render("admin/coupons", {
        coup: couponData,

        pagination: couponData,
        currentPage: page,
        perPage,
        nextPage,
        hasPrevPage,
        hasNextPage,
        totalPages,
      });
    } catch (error) {
      console.error("Error fetching the coupons from DB", error);
      res.redirect("/pageerror");
    }
  },

  // Add Coupons
  addCoupons: async (req, res) => {
    const { couponCode, couponDescription, couponRateOfDiscount, couponMinPurchaseAmount, startingDate, expiringDate } = req.body;

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
        startingDate,
        expiringDate,
      });
      await newCoupon.save();
      return res.json({ success: true, message: "Coupon added successfully" });
    } catch (error) {
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  getCouponById: async (req, res) => {
    try {
      const { id } = req.params;
      const coupon = await Coupon.findById(id);
      if (!coupon) {
        return res.status(404).json({ success: false, message: "Coupon not found" });
      }
      res.json(coupon);
    } catch (error) {
      res.status(500).json({ success: false, message: "Server error" });
    }
  },

  // Update a coupon by its ID
  updateCoupon: async (req, res) => {
    try {
      const { id } = req.params;
      const updatedCoupon = await Coupon.findOneAndUpdate(
        { _id: id },
        {
          code: req.body.couponCode,
          description: req.body.couponDescription,
          rateOfDiscount: req.body.couponRateOfDiscount,
          minPurchaseAmount: req.body.couponMinPurchaseAmount,
          startingDate: req.body.startingDate,
          expiringDate: req.body.expiringDate,
        },
        { new: true }
      );

      if (!updatedCoupon) {
        return res.status(404).json({ success: false, message: "Coupon not found" });
      }

      res.json({ success: true, message: "Coupon updated successfully", coupon: updatedCoupon });
    } catch (error) {
      res.status(500).json({ success: false, message: "Server error" });
    }
  },

  // Delete Coupon
  deleteCoupon: async (req, res) => {
    try {
      const { couponCode } = req.body;

      const deleteCouponFromDB = await Coupon.findOneAndDelete({ code: couponCode });
      if (deleteCouponFromDB) {
        return res.json({ success: true, message: "Coupon deleted successfully" });
      } else {
        return res.json({ success: false, message: "Coupon deletion incomplete" });
      }
    } catch (error) {
      return res.status(500).json({ error: "Internal server error" });
    }
  },
};
