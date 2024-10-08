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
      let startDate = req.query.startDate || new Date(new Date().setFullYear(new Date().getFullYear() - 1)); // Default to one year ago
      let endDate = req.query.endDate || new Date(); // Default to current date

      // Convert string dates to Date objects if provided as strings
      startDate = new Date(startDate);
      endDate = new Date(endDate);

      // Convert the start and end dates to UTC format using .toISOString()
      const startDateUTC = new Date(startDate).toISOString(); // Convert start date to UTC
      const endDateUTC = new Date(endDate).toISOString(); // Convert end date to UTC

      console.log(`Start Date (UTC): ${startDateUTC}`);
      console.log(`End Date (UTC): ${endDateUTC}`);

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
        {
          // Match orders with 'createdAt' between 'startDate' and 'endDate'
          $match: {
            createdAt: {
              $gte: startDate,
              $lte: endDate,
            },
          },
        },
        { $unwind: "$items" }, // Unwind items array
        {
          $lookup: {
            from: "products", // Assuming 'products' is your product collection
            localField: "items.productId",
            foreignField: "_id",
            as: "productInfo",
          },
        },
        { $unwind: "$productInfo" }, // Unwind productInfo to access fields
        {
          $group: {
            _id: "$items.productId", // Group by productId
            productName: { $first: "$productInfo.name" }, // Get product name from populated data
            totalQuantitySold: { $sum: "$items.quantity" }, // Sum of quantities sold
            totalRevenueForProduct: {
              $sum: {
                $multiply: ["$items.quantity", { $toDouble: "$items.price" }], // Calculate revenue for the product
              },
            },
          },
        },
        {
          $sort: {
            totalQuantitySold: -1,
          },
        },
        // Additional grouping and final project stage...
      ]);

      const bestSellingCat = await Order.aggregate([
        {
          // Match orders with 'createdAt' between 'startDate' and 'endDate'
          $match: {
            createdAt: {
              $gte: startDate,
              $lte: endDate,
            },
          },
        },
        { $unwind: "$items" }, // Unwind items array
        {
          $lookup: {
            from: "products", // Lookup products collection
            localField: "items.productId", // Match productId from items
            foreignField: "_id", // Match with _id in products
            as: "productInfo",
          },
        },
        { $unwind: "$productInfo" }, // Unwind productInfo to access product fields
        {
          $lookup: {
            from: "categories", // Lookup category collection
            localField: "productInfo.category", // Match category field from productInfo
            foreignField: "_id", // Match with _id in categories
            as: "categoryInfo",
          },
        },
        { $unwind: "$categoryInfo" }, // Unwind categoryInfo to access category fields
        {
          $group: {
            _id: "$categoryInfo._id", // Group by category ID
            categoryName: { $first: "$categoryInfo.name" }, // Capture category name
            categoryQuantitySold: { $sum: "$items.quantity" }, // Sum quantities sold for the category
            totalRevenueForCategory: {
              $sum: {
                $multiply: ["$items.quantity", { $toDouble: "$items.price" }], // Calculate total revenue for the category
              },
            },
          },
        },
        {
          $sort: {
            categoryQuantitySold: -1, // Sort by total quantity sold for each category
          },
        },
      ]);

      const bestSellingBrands = await Order.aggregate([
        {
          // Match orders with 'createdAt' between 'startDate' and 'endDate'
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
