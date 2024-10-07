const mongoose = require("mongoose");
const {Schema} = mongoose;

const bannerSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        default: ' '
    },
    image: {
        filename: String,
        originalName: String,
        path: String,
    },
    reference: {
        type: String,
        required: true,
    },
    isActive: {
        type: Boolean,
        required: true,
        default: true,
    }
},{
    timestamps: true,
})

const Banner = mongoose.model("Banner", bannerSchema);
module.exports = Banner;