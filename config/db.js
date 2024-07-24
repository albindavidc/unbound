const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async ()=>{
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Database is connected');
    } catch (error) {
        console.error(`Database is not connected = ${error.message}`);
        process.exit(1);
    }
}

module.exports = connectDB;