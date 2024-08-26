const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Color = require("../../models/attributes/colorSchema");
const Brand = require("../../models/attributes/brandSchema");
const Size = require("../../models/attributes/sizeSchema");

module.exports = {
  // Fetch all products
  loadProductList: async (req, res) => {
    try {
      const products = await Product.find({ isActive: true })
      .populate('variants.color'); // Ensure color data is populated


      const categories = await Category.find({});
      const brand = await Brand.find({});
      const size = await Size.find({});
      const colors = await Color.find({isListed:true});

      const productCount = await Product.countDocuments({ isActive: true });


      res.render("user/product-list", {
        user: req.session.user,
        products,
        categories,
        brand,
        size,
        colors,
        productCount,
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
        .populate("category")
        .populate("variants.color")
        .populate("variants.size")
        .populate("ratings.user")
        .populate("brand");

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Check variant stock and calculate offer price if applicable
      product.variants.forEach((variant) => {
        variant.isOutOfStock = variant.stock <= 0;
      });

      // Calculate the offer price if there's an offer
      const offerPrice = product.offerpercentage > 0 ? product.price * (1 - product.offerpercentage / 100) : product.price;

      // Fetch related products based on the category
      const relatedProducts = await Product.find({
        category: product.category._id,
        _id: { $ne: productId }, // Exclude the current product
        isActive: true,
      }).limit(4);

      const productData = await Product.find({ productId });

      res.render("user/product-details", {
        product,
        productData,
        relatedProducts,
        user: req.session.user,
        offerPrice,
      });
    } catch (error) {
      console.error("Error fetching product details:", error);
      res.status(500).send("Internal Server Error");
    }
  },
};
