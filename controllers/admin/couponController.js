const Coupon = require("../../models/couponSchema");


module.exports ={
    getCouponList: async (req, res) => {

        try {
            const couponData = await Coupon.find();

            res.render("admin/coupons", {coup: couponData});
        } catch (error) {
            console.error("Error fetching the coupons from DB", error);
            res.redirect("/pageerror");
        }
    },

    addCoupons: async (req, res) =>{
        const {couponCode, couponDescription, couponRateOfDiscount, couponMinPurchaseAmount, couponMaxDiscount} = req.body;

        try {
            const existingCoupon = await Coupon.findOne({couponCode});
            if(existingCoupon){
                return res.status(400).json({error: "Coupon already exists"});
            }

            const newCoupon = new Coupon({
                code:couponCode,
                description: couponDescription,
                rateOfDiscount: couponRateOfDiscount,
                minPurchaseAmount: couponMinPurchaseAmount,
                maximumDiscount: couponMaxDiscount,
            });
            await newCoupon.save();
            return res.json({success:true, message: "Coupon added successfully"});
        } catch (error) {
            console.error(error);
            return res.status(500).json({error: "Internal server error"});
        }
    },

    deleteCoupon: async(req, res) => {
        try {
            const {couponId} = req.body;
            console.log("this is coupon id",couponId);
    
            const deleteCouponFromDB = await Coupon.deleteOne({couponId});
            if(deleteCouponFromDB.deletedCount >0 ){
                return res.json({success:true, message: "Coupon deleted successfully"});
            }else{
                return res.json({success: false, message: "Coupon deletion incomplete"})
            }
        } catch (error) {
            console.error(error);
            return res.status(500).json({error: "Internal server error"})
        }
    }
    
}