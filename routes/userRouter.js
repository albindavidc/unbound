const express = require("express");
const router = express.Router();
const passport = require("passport");
const {userAuth, isLogedOut, checkUserStatus} = require("../middlewares/auth");
const userController = require("../controllers/user/userController");
const productController = require("../controllers/user/productController");
const cartController = require('../controllers/user/cartController');
const checkoutController = require("../controllers/user/checkoutController");
const orderController = require("../controllers/user/orderController");
const wishlistController = require("../controllers/user/wishlistController");
const couponController = require("../controllers/user/couponController")
const walletController = require("../controllers/user/walletController")

//Home page - Page not found
router.get("/",checkUserStatus,userAuth, userController.loadHomepage);
router.get("/pageNotFound", userController.pageNotFound);
router.get("/logout", userController.logout);

//Signup Managment
router
.route("/signup")
.get(isLogedOut, userController.loadSignup)
.post(userController.signup);

router.get("/verify-otp", userController.getVerifyOtp);
router.post("/auth/verify-otp", userController.verifyOtp);
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
router.get("/user/product-list",userAuth,checkUserStatus, productController.loadProductList);
router.get("/user/product-list/:id",userAuth,checkUserStatus, productController.loadProductDetails);
router.get("/customizeProduct/:id", userAuth,checkUserStatus, productController.loadCustomizeProduct)
router.post("/save-canvas", productController.saveCustomizedImage)
router.post("/product-details-customization", productController.productDetailsCustomConfirm)


// User-Profile
router
.route("/profile")
.all(userAuth, checkUserStatus) 
.get(userController.getUserProfile)
.post(userController.editProfile);

// router.get("/product", productController.getCategory);
router.post('/reset-password', userController.resetPassword);

router
  .route("/orders")
  .get(orderController.getOrders);
router
  .route("/order/:orderId")
  .all(userAuth, checkUserStatus)
  .get(orderController.getOrder)
  .put(orderController.updateOrder);

router.post("/continueOrder", orderController.continueOrder)
router.post("/submit-review/:productId/:orderId", orderController.submitReview);


  router
  .route("/wallet")
  .get(walletController.getWallet);
  router.post('/add-to-wallet', walletController.addToWallet)
  router.post('/verify-wallet-payment', walletController.verifyPayment)
  
  
  router
  .route("/wishlist")
  .get(wishlistController.getWishlist)
router.delete("/wishlist/:productId", wishlistController.deleteWishlist)
router.post("/wishlist/:productId", wishlistController.addWishlist);

//User-Address
router.get("/address", userController.getAddress);
router.post("/address/add-address", userController.addAddress);

router
  .route("/address/edit-address/:id")
  .get(userController.getEditAddress)
  .post(userController.editAddress)

router
  .route("/address/delete-address/:id")
  .delete(userController.deleteAddress);


//Cart
router.get("/cart", userAuth, cartController.getCart);
router.post("/user/add-to-cart", cartController.addToCart);
router.delete('/cart/remove/:productId/:variantId', cartController.removeCartItem);


router.put('/cart/:id/:variant/increment', userAuth, cartController.incrementCartItem);
router.put('/cart/:id/:variant/decrement', userAuth, cartController.decrementCartItem);


router.get("/checkout", checkoutController.getCheckout);
router.post("/checkout/add-address", userController.addAddress);
router
.route("/checkout/edit-address/:id")
.get(userController.getEditAddress)
.post(userController.editAddress)
.delete(userController.deleteAddress);
router.post("/checkout/verify-coupon", couponController.applyCoupon);
router.post("/checkout/remove-coupon", couponController.removeCoupon);

router.post("/place-order", checkoutController.placeOrder);
router.post("/user/verify-payment", checkoutController.verifyPayment);
router.get("/order-success", cartController.getOrderSuccess);

router.get("/referrals", userController.getReferrals);
router.get("/register", userController.loadLogin)


exports.loadLogin = (req, res) => {
  const ref = req.query.ref;
  res.render("register", { ref });
};

router.get('/downloadInvoicePdf', orderController.getInvoicePdf);

module.exports = router;
