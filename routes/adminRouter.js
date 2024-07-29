const express= require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminController");

router.get("/login", adminController.loadLogin);    
router.post("/login", adminController.login);
router.get("/",adminController.loadDashboard);

module.exports = router;
