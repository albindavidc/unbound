const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Color = require("../../models/attributes/colorSchema");
const Brand = require("../../models/attributes/brandSchema");
const Size = require("../../models/attributes/sizeSchema");
const Variants = require("../../models/attributes/variantSchema");
const Cart = require("../../models/cartSchema");

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
        sortQuery.sellingPrice = 1;
        break;
      case "high-to-low":
        sortQuery.sellingPrice = -1;
        break;
      case "a-z":
        sortQuery.name = 1;
        break;
      case "z-a":
        sortQuery.name = -1;
        break;
      case "new_arrival":
        sortQuery.arrivalDate = -1;
        break;
      case "in_stock":
        filterQuery.variants = { $elemMatch: { stock: { $gt: 0 } } };
        break;
      default:
        sortQuery = {};
    }

    try {
      const product = await Product.find({ isActive: true }).populate("variants.color").populate("variants.stock");

      const categories = await Category.find({ isListed: true });
      const brand = await Brand.find({ isListed: true });
      const size = await Size.find({});
      const colors = await Color.find({ isListed: true });
      const variants = await Variants.find({});

      const perPage = 20;
      const page = parseInt(req.query.page) || 1;

      const products = await Product.find({ ...query, ...filterQuery })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .sort(sortQuery)
        .exec();

      const productCount = await Product.countDocuments({ ...query, ...filterQuery });

      const nextPage = parseInt(page) + 1;
      const totalPages = Math.ceil(productCount / perPage);
      const hasPrevPage = page > 1;
      const hasNextPage = page < totalPages;

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

        pagination: product,
        currentPage: page,
        perPage,
        nextPage,
        hasPrevPage,
        hasNextPage,
        totalPages,
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
        .populate("variants.stock")
        .populate("wishlist")
        .populate("bundlePrice bundleQuantity quantity");

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      let stocks;
      product.variants.forEach((variant) => {
        console.log("This is stock:", variant.stock || "Stock not available");
        stocks = variant.stock;
      });

      console.log("this is stock", stocks);

      // Check variant stock and calculate offer price if applicable
      product.variants.forEach((variant) => {
        variant.isOutOfStock = variant.stock <= 0;
      });

      // Fetch related products based on the category
      const relatedProducts = await Product.find({
        category: product.category._id,
        _id: { $ne: productId }, // Exclude the current product
        isActive: true,
      }).limit(4);

      const productData = await Product.find({ productId });

      const cart = await Cart.findOne({ userId: req.session.user });
      let existingQuantity;
      if (cart) {
        const existingItem = cart.items.find((item) => item.productId.toString() === productId);

        if (existingItem) {
          existingQuantity = existingItem.quantity;
        } else {
          existingQuantity = 0;
        }
      } else {
        existingQuantity = 0;
      }

      console.log(existingQuantity, "this is existing cart item");

      const productWishlist = product.wishlist;

      console.log("this is product wishlist", productId);

      res.render("user/product-details", {
        productWishlist,
        productId,
        product,
        productData,
        relatedProducts,
        user: req.session.user,
        cart,
        stocks,
        existingQuantity,
      });
    } catch (error) {
      console.error("Error fetching product details:", error);
      res.status(500).send("Internal Server Error");
    }
  },

  loadCustomizeProduct: async (req, res) => {
    try {
      const user = req.session.user;
      const product = await Product.findById(req.params.id);
      res.render("user/customizeProduct", { product, user });
    } catch (error) {
      console.error("Error fetching product details: ");
    }
  },

  saveCustomizedImage: async (req, res) => {
    const {allCanvasData, productId} = req.body;

    if (!allCanvasData) {
      return res.status(400).json({ error: "Product ID and canvas data are required." });

    }
    try {
      const product = await Product.findByIdAndUpdate(
        productId,
        {canvasData: allCanvasData},
        // { $set: update }, 
        { new: true });
      if (!product) {
        return res.status(500).json({ error: "Error saving canvas data" });
      }
      

      res.json({ success: true, message: "Canvas saved successfully", product });
    } catch (error) {}
  },
};
