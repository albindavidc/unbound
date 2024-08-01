const mongoose = require("mongoose");
const sizeSchema = new mongoose.Schema({
    value: {
        type: Number,
        required: true,
        unique: true
    },
    isDeleted:{
        type:Boolean,
        default:false
    }
},{
    timestamps: true
});

module.exports = mongoose.model('Size', sizeSchema)