const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const customerController = require("../controllers/admin/customerController");
const categoryController = require("../controllers/admin/categoryController");
const productController = require("../controllers/admin/productController");
const { userAuth, adminAuth } = require("../middlewares/auth");
const {productUpload} = require('../middlewares/multer'); // Adjust path accordingly


//Error - page
router.get("/pageerror", adminController.pageerror);

//Login - Management

router.get("/login", adminController.loadLogin);
router.get("/", adminController.redirectToLogin);
router.post("/login", adminController.login);
router.get("/dashboard", adminAuth, adminController.loadDashboard);
router.get("/logout", adminController.logout);

//Customer - Management
router.get("/users", adminAuth, customerController.customerInfo);
router.get("/blockCustomer", adminAuth, customerController.customerBlocked);
router.get("/unblockCustomer", adminAuth, customerController.customerunBlocked);

//Category - Management
router.get("/category", adminAuth, categoryController.categoryInfo); 
router.get("/category/:id", adminAuth, categoryController.getCategoryDetails);

router.post("/addCategory", adminAuth, categoryController.addCategory);
router.post("/editCategory", adminAuth, categoryController.editCategory);
router.get("/category/:id/list", adminAuth, categoryController.categoryListed);
router.get("/category/:id/unlist", adminAuth, categoryController.categoryUnlisted);

// Product Management Routes
router.get("/products", productController.getProductInfo);

router.get("/stocks", productController.getStocks);
router.patch("/update-stock/", productController.updateStock);

router
  .route("/products/add-product")
  .get(productController.getAddProduct)
  .post(
    productUpload.fields([{ name: "images", maxCount: 3 }, { name: "primaryImage" }]),
    productController.addProduct
  );

router
  .route("/products/edit-product/:id")
  .get(productController.getEditProduct)
  .post(
    productUpload.fields([
      { name: "image2", maxCount: 1 }, 
      { name: "image3", maxCount: 1 }, 
      { name: "image4", maxCount: 1 }, 
      { name: "primaryImage" }
    ]),
    productController.editProduct
  );

  
// list/unlist product
router.patch("/products/toggle-listing/:id", productController.toggleListing);

// Product Delete
router.delete("/products/delete-product/:id", productController.deleteProduct);

// Product Image Delete
router.delete("/products/delete-image/", productController.deleteImage);















module.exports = router;
