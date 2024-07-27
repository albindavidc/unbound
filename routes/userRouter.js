const express = require("express");
const router = express.Router();
const passport = require("passport");
const userController = require("../controllers/user/userController");

router.get('/pageNotFound', userController.pageNotFound);
router.get('/', userController.loadHomepage);

router.get("/user/signup", userController.loadSignup);
router.post("/signup", userController.signup);

router.post("/verify-otp", userController.verifyOtp);
router.post("/resend-otp", userController.resendOtp);

router.get("/auth/google", passport.authenticate("google", {scope: ["profile", "email"]}));
router.get("/auth/google/callback", passport.authenticate("google", {failureRedirect: "/signup"}),(req,res) => {
    res.redirect("/")
})




router.get("/shop", userController.loadShopping);


module.exports = router;