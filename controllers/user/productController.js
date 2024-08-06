const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema"); // Assuming you have a Category schema

module.exports = {
  // Fetch all products
  loadProductList : async (req, res) => {
    try {
        const products = await Product.find({ isActive: true }); // Assuming you have a Product model
        res.render('user/product-list', { user:req.session.user,
            products: products });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading products');
    }
},

};

