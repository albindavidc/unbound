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
    }
})

module.exports = mongoose.model('Brand', brandSchema)