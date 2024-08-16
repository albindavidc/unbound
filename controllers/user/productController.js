const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema"); // Assuming you have a Category schema

module.exports = {
  // Fetch all products
  loadProductList: async (req, res) => {
    try {
      const products = await Product.find({ isActive: true }); // Assuming you have a Product model

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
    // Function to fetch related products based on the category
    const getRelatedProducts = async (category, excludeProductId) => {
      try {
        // Find products that belong to the same category but exclude the current product
        return await Product.find({
          category: category,
          _id: { $ne: excludeProductId }, // Exclude the current product
        }).limit(4); // Limit to 4 related products
      } catch (error) {
        console.error("Error fetching related products:", error);
        return []; // Return an empty array if there's an error
      }
    };

    try {
      const productId = req.params.id;

      
      // Fetch the product data asynchronously from the database
      const product = await Product.findById(productId);

      // Fetch related products based on category
      const relatedProducts = await getRelatedProducts(
        product.category,
        productId
      );

      const products = await Product.findById(productId).populate('category');

      console.log("this is a sample product:", products.category.name)

      if (!product) {
        // Product not found, respond with 404
        return res.status(404).send("Product not found");
      }

      // Render the product details page with the fetched product data
      res.render("user/product-details", {
        user: req.session.user,
        product,
        products,
        relatedProducts,
      });
    } catch (error) {
      console.error("Error fetching product details:", error);
      res.status(500).send("Internal Server Error");
    }
  },
};
