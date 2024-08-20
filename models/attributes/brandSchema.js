const mongoose = require('mongoose')
const Schema = mongoose.Schema

const brandSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    isActive: {
        type: Boolean,
        default: true
    },
    image: {
        type: [String],
        required: true,
    },
    
},{timestamps:true})

module.exports = mongoose.model('Brand', brandSchema)