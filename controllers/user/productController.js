const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Color = require("../../models/attributes/colorSchema");
const Brand = require("../../models/attributes/brandSchema");
const Size = require("../../models/attributes/sizeSchema");
const Variants = require("../../models/attributes/variantSchema")

const mongoose = require("mongoose");

module.exports = {
  loadProductList: async (req, res) => {
    const { color, size, price, brand, category, sort } = req.query;
  
    const currentCategoryId = req.query.categoryId;
    const currentBrandId = req.query.brandId;
    const currentSizeId = req.query.sizeId;
    let query = {};
  
    if (category && category !== "all") {
      query.category = category;
    }
  
    if (brand && brand !== "all") {
      query.brand = brand;
    }
  
    if (price) {
      const [minPrice, maxPrice] = price.split("-").map(Number);
      query.sellingPrice = { $gte: minPrice, $lte: maxPrice };
    }
  
    if (size && mongoose.Types.ObjectId.isValid(size) && size !== "all") {
      query["variants.size"] = size;
    }
  
    if (color && mongoose.Types.ObjectId.isValid(color) && color !== "all") {
      query["variants.color"] = color;
    }
  
    let sortQuery = {};
    let filterQuery = {}; // Initialize filter query
  
    switch (sort) {
      case "low-to-high":
        sortQuery.sellingPrice = 1; // Ascending order
        break;
      case "high-to-low":
        sortQuery.sellingPrice = -1; // Descending order
        break;
      case "a-z":
        sortQuery.name = 1; // Ascending order
        break;
      case "z-a":
        sortQuery.name = -1; // Descending order
        break;
      case "new_arrival":
        sortQuery.arrivalDate = -1;
        break;
      case "in_stock":
        filterQuery.variants = { $elemMatch: { stock: { $gt: 0 } } }; // Use $elemMatch to filter out-of-stock products
        break;
      default:
        sortQuery = {}; // No sorting
    }
  
    try {
      const product = await Product.find({ isActive: true }).populate("variants.color").populate("variants.stock");
  
      const categories = await Category.find({});
      const brand = await Brand.find({});
      const size = await Size.find({});
      const colors = await Color.find({ isListed: true });
      const variants = await Variants.find({ isListed: true });
  
      const products = await Product.find({ ...query, ...filterQuery }).sort(sortQuery);
      const productCount = await Product.countDocuments({ ...query, ...filterQuery });
  
      res.render("user/product-list", {
        user: req.session.user,
        product,
        products,
        categories,
        brand,
        size,
        colors,
        productCount,
        req: req.query,
        currentCategoryId,
        currentBrandId,
        currentSizeId,
        variants,
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
        .populate("brand")
        .populate("variants.stock");

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }


      let stocks ;
      product.variants.forEach((variant) => {
        console.log("This is stock:", variant.stock || "Stock not available");
        stocks = variant.stock;
      });

      console.log("this is stock", stocks);

      // Check variant stock and calculate offer price if applicable
      product.variants.forEach((variant) => {
        variant.isOutOfStock = variant.stock <= 0;
      });

      // const offerPrice = product.offerpercentage > 0 ? product.price * (1 - product.offerpercentage / 100) : product.price;

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
        // offerPrice,
        stocks,
      });
    } catch (error) {
      console.error("Error fetching product details:", error);
      res.status(500).send("Internal Server Error");
    }
  },
};
