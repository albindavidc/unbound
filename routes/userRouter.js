const express = require("express");
const router = express.Router();
const passport = require("passport");
const {userAuth, isLogedOut, checkUserStatus} = require("../middlewares/auth");
const userController = require("../controllers/user/userController");
const productController = require("../controllers/user/productController");
const cartController = require('../controllers/user/cartController');
const checkoutController = require("../controllers/user/checkoutController");
const orderController = require("../controllers/user/orderController");


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

// router.get("/user/product-list/filter", productController.filterProducts); // For filtered products



// User-Profile
router
.route("/profile")
.all(userAuth, checkUserStatus)  // Ensure authentication and user status check for both GET and POST
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
  .put(orderController.returnOrder)
  // .delete(orderController.cancelOrder);



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


// router.get("/shop/order-success", cartController.getOrderSuccess);


router.get(
  "/cart/remove",
  cartController.removeCartItem
);
router.delete('/remove-from-cart', cartController.removeCartItem);


router.get(
  "/cart/increase-quantity/:id/:variant",
  cartController.incrementCartItem
);
router.get(
  "/cart/decrease-quantity/:id/:variant",
  cartController.decrementCartItem
);


router.get("/checkout", checkoutController.getCheckout);


router.post("/checkout/add-address", userController.addAddress);
router
.route("/checkout/edit-address/:id")
.get(userController.getEditAddress)
.post(userController.editAddress)
.delete(userController.deleteAddress);

router
.route("/place-order")
.post(checkoutController.placeOrder);


router.get("/order-success", cartController.getOrderSuccess);


module.exports = router;
