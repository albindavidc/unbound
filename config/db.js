// db.js

require("dotenv").config();
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    let url = process.env.MONGODB_URI;
    await mongoose.connect(url);
  } catch (error) {
    process.exit(1);
  }
};

module.exports = connectDB;
