const express = require("express");
const router = express.Router();
const passport = require("passport");
const {userAuth} = require("../middlewares/auth");
const userController = require("../controllers/user/userController");
const productController = require("../controllers/user/productController");



//Home page - Page not found
router.get("/",userAuth, userController.loadHomepage);
router.get("/pageNotFound", userController.pageNotFound);
router.get("/logout", userController.login);

//Signup Managment
router.get("/user/signup", userController.loadSignup);
router.post("/signup", userController.signup);
router.post("/verify-otp", userController.verifyOtp);
router.post("/resend-otp", userController.resendOtp);

router.get(
  "/auth/google",
  passport.authenticate("google",  {  scope: ["profile", "email"] })
);
router.get(
  "/auth/google/callback",
  passport.authenticate("google",  { failureRedirect: "/signup" }),
  (req, res) => {
    res.redirect("/");
  }
);


//Signin Managment
router.get("/login", userController.loadLogin);
router.post("/login", userController.login);


router.get("/user/product-list/:id",userAuth, productController.loadProductDetails);
router.get("/user/product-list",userAuth, productController.loadProductList);






module.exports = router;
