const mongoose = require("mongoose");
const {Schema} = mongoose;

const categorySchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: function(v) {
                return /^[A-Z][a-z]*$/.test(v); // Ensures first letter is capital and the rest are lowercase
            },
            message: props => `${props.value} is not a valid name!`
        }
    },
    description: {
        type: String,
        required: true,
    },
    isListed: {
        type: Boolean,
        default: true,
    },
}, {timestamps: true});


const Category = mongoose.model("Category", categorySchema);
module.exports = Category;