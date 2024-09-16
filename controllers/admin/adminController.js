const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema")
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
      const paymentMethods = ['Online', 'Wallet', 'COD'];  // Define all possible payment methods

      const order = await Order.aggregate([
        {
          $group: {
            _id:"$paymentMethod",  // Group by payment method
            users:{$addToSet:"$customerId"}  // Collect unique users
          }
        },
        {
          $project: {
            _id: 0,
            paymentMethod:"$_id",
            userCount:{$size:"$users"}  // Count unique users per method
          }
        }
      ]);
      
      
      console.log(order, "this is the order from dashboard")
      res.render("admin/dashboard", {userCount, productCount, order});
    } catch (error) {
      console.log("Dashboard error", error);

      res.redirect("/pageerror");
    }
  }else {
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
