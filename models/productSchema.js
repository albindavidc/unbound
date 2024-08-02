const mongoose = require('mongoose');

const RatingSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Reference to the user who submitted the rating
    rating: { type: Number, required: true }, // Rating value (e.g., 1-5 stars)
    review: { type: String }, 
  }, { timestamps: true });

const ProductSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    brand: {
        type: String,
        required: true,
      
    },
    category: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    image: {
        type: Array,
        required: true
    },
    categoryid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    },
    brandid:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Brand'
    },
    quantity: {
        type: Number
    },

    color: {
        type: Array
    },
    regularprice: {
        type: Number,
        required: true
    },
    offerpercentage: {
        type: Number,
        default: 0
    },
    price: {
        type: Number,
        required: true
    },
    ratings: [RatingSchema] 
},
    { timestamps: true }
);

module.exports = mongoose.model('Product', ProductSchema);