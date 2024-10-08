require("dotenv").config();
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    let url = process.env.MONGODB_URI;
    console.log(url,"this is url");
    await mongoose.connect(url);
    console.log("Database is connected");
  } catch (error) {
    console.error(`Database is not connected = ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
