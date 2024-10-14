// adminController.js

const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/attributes/brandSchema");
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
      // Extract the start and end dates from the query parameters, or provide defaults if not specified
      let startDate = req.query.startDate || new Date(new Date().setFullYear(new Date().getFullYear() - 1));
      let endDate = req.query.endDate || new Date();

      // Convert string dates to Date objects if provided as strings
      startDate = new Date(startDate);
      endDate = new Date(endDate);

      // Convert the start and end dates to UTC format using .toISOString()
      const startDateUTC = new Date(startDate).toISOString();
      const endDateUTC = new Date(endDate).toISOString();

      console.log(`Start Date (UTC): ${startDateUTC}`);
      console.log(`End Date (UTC): ${endDateUTC}`);

      const userCount = await User.find().countDocuments();
      const productCount = await Product.find().countDocuments();
      // const paymentMethods = ["Online", "Wallet", "COD"];

      const order = await Order.aggregate([
        {
          $group: {
            _id: "$paymentMethod",
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
        {
          $match: {
            createdAt: {
              $gte: startDate,
              $lte: endDate,
            },
          },
        },
        { $unwind: "$items" },
        {
          $lookup: {
            from: "products",
            localField: "items.productId",
            foreignField: "_id",
            as: "productInfo",
          },
        },
        { $unwind: "$productInfo" },
        {
          $group: {
            _id: "$items.productId",
            productName: { $first: "$productInfo.name" },
            totalQuantitySold: { $sum: "$items.quantity" },
            totalRevenueForProduct: {
              $sum: {
                $multiply: ["$items.quantity", { $toDouble: "$items.price" }],
              },
            },
          },
        },
        {
          $sort: {
            totalQuantitySold: -1,
          },
        },
      ]);

      const bestSellingCat = await Order.aggregate([
        {
          $match: {
            createdAt: {
              $gte: startDate,
              $lte: endDate,
            },
          },
        },
        { $unwind: "$items" },
        {
          $lookup: {
            from: "products",
            localField: "items.productId",
            foreignField: "_id",
            as: "productInfo",
          },
        },
        { $unwind: "$productInfo" },
        {
          $lookup: {
            from: "categories",
            localField: "productInfo.category",
            foreignField: "_id",
            as: "categoryInfo",
          },
        },
        { $unwind: "$categoryInfo" },
        {
          $group: {
            _id: "$categoryInfo._id",
            categoryName: { $first: "$categoryInfo.name" },
            categoryQuantitySold: { $sum: "$items.quantity" },
            totalRevenueForCategory: {
              $sum: {
                $multiply: ["$items.quantity", { $toDouble: "$items.price" }],
              },
            },
          },
        },
        {
          $sort: {
            categoryQuantitySold: -1,
          },
        },
      ]);

      const bestSellingBrands = await Order.aggregate([
        {
          $match: {
            createdAt: {
              $gte: startDate,
              $lte: endDate,
            },
          },
        },
        { $unwind: "$items" },
        {
          $lookup: {
            from: "products",
            localField: "items.productId",
            foreignField: "_id",
            as: "productInfo",
          },
        },
        { $unwind: "$productInfo" },
        {
          $lookup: {
            from: "brands",
            localField: "productInfo.brand",
            foreignField: "_id",
            as: "brandInfo",
          },
        },
        { $unwind: "$brandInfo" },
        {
          $group: {
            _id: "$brandInfo._id",
            brandName: { $first: "$brandInfo.name" },
            brandQuantitySold: { $sum: "$items.quantity" },
            totalRevenueForBrand: {
              $sum: {
                $multiply: ["$items.quantity", { $toDouble: "$items.price" }],
              },
            },
          },
        },
        {
          $sort: {
            brandQuantitySold: -1,
          },
        },
      ]);

      const categoryCount = await Category.find().countDocuments();
      const brandCount = await Brand.find().countDocuments();

      res.render("admin/dashboard", { userCount, productCount, order, orderBar, bestSellingCat, bestSellingBrands, categoryCount, brandCount });
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
