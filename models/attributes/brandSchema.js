const mongoose = require('mongoose')
const Schema = mongoose.Schema

const brandSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    image: {
        type: [String],
        required: true,
    },
    isListed:{
        type: Boolean,
        default: true,
    }
    
},{timestamps:true})

module.exports = mongoose.model('Brand', brandSchema)