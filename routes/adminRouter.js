const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const customerController = require("../controllers/admin/customerController");
const categoryController = require("../controllers/admin/categoryController");
const productController = require("../controllers/admin/productController");
const { userAuth, adminAuth } = require("../middlewares/auth");
const { productUpload } = require('../config/multer'); // Adjust path accordingly

// Error page
router.get("/pageerror", adminController.pageerror);

// Login Management
router.get("/login", adminController.loadLogin);
router.get("/", adminController.redirectToLogin);
router.post("/login", adminController.login);
router.get("/dashboard", adminAuth, adminController.loadDashboard);
router.get("/logout", adminController.logout);

// Customer Management
router.get("/users", adminAuth, customerController.customerInfo);
router.get("/blockCustomer", adminAuth, customerController.customerBlocked);
router.get("/unblockCustomer", adminAuth, customerController.customerunBlocked);

// Category Management
router.get("/category", adminAuth, categoryController.categoryInfo);
router.get("/category/:id", adminAuth, categoryController.getCategoryDetails);
router.post("/addCategory", adminAuth, categoryController.addCategory);
router.post("/editCategory", adminAuth, categoryController.editCategory);
router.get("/category/:id/list", adminAuth, categoryController.categoryListed);
router.get("/category/:id/unlist", adminAuth, categoryController.categoryUnlisted);

// Product Management Routes

router.get('/products', adminAuth, productController.getProducts);
router.get('/products/editProducts', adminAuth, productController.getEditProducts);
router.get('/products/deleteProduct/:id', adminAuth, productController.deleteProduct);
router.get("/products/stocks", adminAuth, productController.getStocks);

router
  .route('/add-product')
  .get(adminAuth, productController.getAddProducts);


router
  .route("/admin/add-product")
  .post(
    adminAuth,
    productUpload.fields([
      { name: "primaryImage", maxCount: 1 },
      { name: "images", maxCount: 4 }
    ]),

    productController.addProducts
  );

router
  .route("/edit-product/:id")
  .get(adminAuth, productController.getEditProducts)
  .post(
    adminAuth,
    productUpload.fields([
      { name: "primaryImage", maxCount: 1 },
      { name: "image2", maxCount: 1 },
      { name: "image3", maxCount: 1 },
      { name: "image4", maxCount: 1 }
    ]),
    (req, res, next) => {
      console.log(req.files); // Log the files being uploaded
      console.log(req.body);  // Log the body of the request
      next();
    },
    productController.editProduct
  );

router.post("/product/action", productController.listOrUnlistProduct);
router.delete("/product/deleteProduct", productController.deleteProduct);
router.post("/product/updateStock", productController.updateStocks);


module.exports = router;
