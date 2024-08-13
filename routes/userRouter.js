const express = require("express");
const router = express.Router();
const passport = require("passport");
const {userAuth, isLogedOut, checkUserStatus} = require("../middlewares/auth");
const userController = require("../controllers/user/userController");
const productController = require("../controllers/user/productController");


//Home page - Page not found
router.get("/",checkUserStatus,userAuth, userController.loadHomepage);
router.get("/pageNotFound", userController.pageNotFound);
router.get("/logout", userController.logout);

//Signup Managment
router.get("/signup", isLogedOut, userController.loadSignup);
router.post("/signup", userController.signup);
router.post("/verify-otp", userController.verifyOtp);
router.post("/resend-otp", userController.resendOtp);

router.get(
  "/auth/google", isLogedOut,
  passport.authenticate("google",  {  scope: ["profile", "email"] })
);
router.get(
  "/auth/google/callback", isLogedOut,
  passport.authenticate("google",  { failureRedirect: "/signup" }),
  (req, res) => {
    req.session.user = req.user._id;
    res.redirect("/");
  }
);


//Signin Managment
router.get("/login",isLogedOut, userController.loadLogin);
router.post("/login", userController.login);

router
  .route("/forgot-password")
  .get(userController.getFrogotPass)
  .post(userController.forgotPassword);

  router.post("/forgotPassVerifyOtp", userController.forgotPassVerifyOtp);

  router.get("/forgot-password-cpassword", userController.passwordReset)
  router.post("/forgot-password-cpassword", userController.passwordChange);

  
  // Product-Managment  
  router.get("/user/product-list/:id",userAuth,checkUserStatus, productController.loadProductDetails);
  router.get("/user/product-list",userAuth,checkUserStatus, productController.loadProductList);
  
  // User-Profile
  router
  .route("/profile", userAuth, checkUserStatus)
  .get(userController.getUserProfile)
  .post(userController.editProfile);
  
  //User-Address
  router.get("/address", userController.getAddress);
  router.post("/address/add-address",userController.addAddress);

router
  .route("/address/edit-address/:id")
  .get(userController.getEditAddress)
  .post(userController.editAddress)

router
  .route("/address/delete-address/:id")
  .delete(userController.deleteAddress);

module.exports = router;
