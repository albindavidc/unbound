const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const customerController = require("../controllers/admin/customerController");
const categoryController = require("../controllers/admin/categoryController");
const productController = require("../controllers/admin/productController");
const { userAuth, adminAuth } = require("../middlewares/auth");
const { productUpload } = require("../middlewares/multer"); // Adjust path accordingly
const attributeController = require("../controllers/admin/attributeController")
const orderController = require("../controllers/admin/orderController");

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
router.get(
  "/category/:id/unlist",
  adminAuth,
  categoryController.categoryUnlisted
);

//
//
// Product Management Routes

router.get("/products", adminAuth, productController.getProducts)

const upload = productUpload.fields([
  { name: "primaryImage", maxCount: 1 },
  { name: "secondaryImage", maxCount: 4 },
]);
router
  .route("/add-product")
  .get(adminAuth, productController.getAddProducts)
  .post(adminAuth, upload, productController.addProducts);

router.post("/product/action", productController.listOrUnlistProduct);
router.delete("/product/deleteProduct", productController.deleteProduct);
router.get(
  "/products/deleteProduct/:id",
  adminAuth,
  productController.deleteProduct
);


const editUpload = productUpload.fields([
  {name: "primaryImage", maxCount: 1},
  {name: "secondaryImage0", maxCount: 1},
  {name: "secondaryImage1", maxCount: 1},
  {name: "secondaryImage2", maxCount: 1},
  {name: "secondaryImage3", maxCount: 1},
])

router
  .route("/edit-product/:id")
  .get(adminAuth, productController.getEditProducts)
  .post(adminAuth, editUpload, productController.editProduct);

  
  router.get("/stocks", productController.getStocks);
  router.patch("/update-stock", productController.updateStock);



//**Attribute-Management */


router.get("/attributes", attributeController.getAttributes);

router
  .route("/attributes/color/:id")
  .get(attributeController.getColor)
  .put(attributeController.editColor);

router
  .route("/attributes/size/:id")
  .get(attributeController.getSize)
  .put(attributeController.editSize);

router
  .route("/attributes/brand/:id")
  .get(attributeController.getBrand)
  .put(attributeController.editBrand);

router
  .route("/attributes/toggleListing/color/:id")
  .patch(attributeController.toggleListingColor);

router
  .route("/attributes/toggleListing/size/:id")
  .patch(attributeController.toggleListingSize);

router
  .route("/attributes/toggleListing/brand/:id")
  .patch(attributeController.toggleListingBrand);

router
  .route("/attributes/delete-color/:id")
  .delete(attributeController.deleteColor);

router
  .route("/attributes/delete-size/:id")
  .delete(attributeController.deleteSize);

router
  .route("/attributes/delete-brand/:id")
  .delete(attributeController.deleteBrand);

router.post("/attributes/add-color", attributeController.addColor);
router.post("/attributes/add-size", attributeController.addSize);
router.post("/attributes/add-brand", attributeController.addBrand);


/**
 * Order Managment
 */

router
  .route("/orderList")
  .get(orderController.getOrderList)
  .post(orderController.updateDeliveryStatus);


module.exports = router;
