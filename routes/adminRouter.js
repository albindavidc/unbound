const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const customerController = require("../controllers/admin/customerController");
const categoryController = require("../controllers/admin/categoryController");
const { userAuth, adminAuth } = require("../middlewares/auth");

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



module.exports = router;
