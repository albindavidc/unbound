const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

//Page-error
const pageerror = async (req, res) => {
  res.render("admin-error");
};

//Load - login page
const loadLogin = (req, res) => {
  if (req.session.admin) {
    return res.redirect("/admin/dashboard");
  }
  res.render("admin/login", { message: null });
};

const redirectToLogin = (req, res) => {
  if (req.session.admin) {
    return res.redirect("/admin/dashboard");
  }

  res.redirect("/admin/login");
};

// login - Dashboard
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await User.findOne({ email, isAdmin: true });
    if (admin) {
      const passMatch = await bcrypt.compare(password, admin.password);
      if (passMatch) {
        req.session.admin = true;
        return res.redirect("/admin/dashboard");
      }
    }
    res.render("admin/login", { message: "Invalid email or password" }); // Render login with error message
  } catch (error) {
    console.log("Login error", error);
    return res.redirect("/pageerror");
  }
};

//Load-Dashboard

const loadDashboard = async (req, res) => {
  if (req.session.admin) {
    try {
      const userCount = await User.find().countDocuments();
      const productCount = await Product.find().countDocuments();
      // const paymentMethods = ["Online", "Wallet", "COD"];

      const order = await Order.aggregate([
        {
          $group: {
            _id: "$paymentMethod", // Group by payment method
            users: { $addToSet: "$customerId" },
          },
        },
        {
          $project: {
            _id: 0,
            paymentMethod: "$_id",
            userCount: { $size: "$users" },
          },
        },
      ]);

      const orderBar = await Order.aggregate([
        { $unwind: "$items" },  // Unwind items array
        {
          $group: {
            _id: "$items.productId",  // Group by productId
            productName: { $first: "$items.productId.name" },  // Get product name
            totalQuantitySold: { $sum: "$items.quantity" },  // Sum of quantities sold
            totalRevenueForProduct: { 
              $sum: { 
                $multiply: ["$items.quantity", { $toDouble: "$items.price" }]  // Calculate revenue for the product
              } 
            }
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$totalRevenueForProduct" },  // Total revenue across all products
            totalDiscount: { $sum: "$couponDiscount" },  // Total discount
            productSoldCount: { $sum: "$totalQuantitySold" },  // Total number of products sold
            productsSold: {  // List of products and their respective counts and revenues
              $push: {
                productId: "$_id",
                productName: "$productName",
                quantitySold: "$totalQuantitySold",
                revenue: "$totalRevenueForProduct"
              }
            }
          }
        },
        {
          $project: {
            _id: 0,
            totalRevenue: "$totalAmount",  // Total revenue across all products
            totalDiscount: 1,
            productSoldCount: 1,
            productsSold: 1  // List of products sold with their quantities and revenues
          }
        }
      ]);
      
      console.log(orderBar, "this is the order from dashboard");
      
      console.log(orderBar, "this is the order from dashboard");
      res.render("admin/dashboard", { userCount, productCount, order, orderBar });
    } catch (error) {
      console.log("Dashboard error", error);

      res.redirect("/pageerror");
    }
  } else {
    res.redirect("/admin/login");
  }
};

//Logout
const logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect("/admin/login");
  });
};

module.exports = {
  loadLogin,
  redirectToLogin,
  login,
  loadDashboard,
  pageerror,
  logout,
};
