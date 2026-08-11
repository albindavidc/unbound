// db.js

require("dotenv").config();
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    let url = process.env.MONGODB_URI;
    await mongoose.connect(url);
    console.log("Database connected successfully");
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
