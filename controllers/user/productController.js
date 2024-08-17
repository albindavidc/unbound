const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema"); 
const Color = require("../../models/attributes/colorSchema");

module.exports = {
  // Fetch all products
  loadProductList: async (req, res) => {
    try {
      const products = await Product.find({ isActive: true }); 

      res.render("user/product-list", {
        user: req.session.user,
        products,
      });
    } catch (error) {
      console.error(error);
      res.status(500).send("Error loading products");
    }
  },

  loadProductDetails: async (req, res) => {
    
      try {
        const productId = req.params.id;
    
        const product = await Product.findById(productId)
          .populate('category')
          .populate('variants.color')
          .populate('variants.size')
          .populate('ratings.user')
          .populate('brand');

        if (!product) {
          return res.status(404).json({ message: 'Product not found' });
        }
    
        // Check variant stock and calculate offer price if applicable
        product.variants.forEach(variant => {
          variant.isOutOfStock = variant.stock <= 0;
        });
    
        // Calculate the offer price if there's an offer
        const offerPrice = product.offerpercentage > 0
          ? product.price * (1 - product.offerpercentage / 100)
          : product.price;
    
        // Fetch related products based on the category
        const relatedProducts = await Product.find({
          category: product.category._id,
          _id: { $ne: productId }, // Exclude the current product
          isActive: true,
        }).limit(4);
    

        res.render('user/product-details', {
          product,
          relatedProducts,
          user: req.session.user,
          offerPrice, 
          
        });
      } catch (error) {
        console.error('Error fetching product details:', error);
        res.status(500).send('Internal Server Error');
      }
  },
};
