const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Color = require("../../models/attributes/colorSchema");
const Brand = require("../../models/attributes/brandSchema");
const Size = require("../../models/attributes/sizeSchema");
const Variants = require("../../models/attributes/variantSchema");
const Cart = require("../../models/cartSchema");
const Customize = require("../../models/customizedProduct");
const Order = require("../../models/orderSchema")

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
        .populate("bundlePrice bundleQuantity quantity")
        .populate("ratings")

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      let stocks;
      product.variants.forEach((variant) => {
        console.log("This is stock:", variant.stock || "Stock not available");
        stocks = variant.stock;
      });

      console.log("this is stock", stocks);

      product.variants.forEach((variant) => {
        variant.isOutOfStock = variant.stock <= 0;
      });

      const relatedProducts = await Product.find({
        category: product.category._id,
        _id: { $ne: productId }, 
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


      const userId = req.session.user
      // const customProduct = await Customize.find(
      //   { userId: req.session.user, "products.productId": productId },
      //   // { products: { $elemMatch: { productId: productId, } } }
      // ).populate("products")

      const customize = await Customize.findOne({ userId: userId });

      let status = false ;
      if(customize){
        customize.products.forEach(item => {
          if(item.productId.toString() === productId.toString()){
            status = item.customizedProductOption
          }
        })
      }

      console.log( customize, status, "this is custom product");
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
        customProduct: status,
      });
    } catch (error) {
      console.error("Error fetching product details:", error);
      res.status(500).send("Internal Server Error");
    }
  },

  loadCustomizeProduct: async (req, res) => {
    try {
      const user = req.session.user;
      const productId = req.params.id

      console.log(productId, "this is product id")
      const product = await Product.findById(productId);
      console.log(product, "this is product")
      res.render("user/customizeProduct", { product, user });
    } catch (error) {
      console.error("Error fetching product details: ");
    }
  },

  saveCustomizedImage: async (req, res) => {
    const { allCanvasData, productId } = req.body;
    const userId = req.session.user;

    if (!allCanvasData) {
      return res.status(400).json({ error: "Product ID and canvas data are required." });
    }
    try {
      const customize = await Customize.findOne({ userId: userId });

      productId, { userId: userId, "products.productId": productId, canvasData: allCanvasData }, { upsert: true }, { new: true };

      if (!customize) {
        const newCustomize = new Customize({
          userId: userId,
          products: [
            {
              productId: productId,
              canvasData: allCanvasData,
            },
          ],
        });
        await newCustomize.save();
        return res.json({ success: true, message: "Canvas saved successfully", customize: newCustomize });
      }

      const existingProductIndex = customize.products.findIndex((product) => product.productId === productId);

      if (existingProductIndex > -1) {
        customize.products[existingProductIndex].canvasData = allCanvasData;
        customize.products[existingProductIndex].customizedProductOption = true;
      } else {
        customize.products.push({
          productId: productId,
          canvasData: allCanvasData,
        });
      }

      await customize.save();

      res.json({ success: true, message: "Canvas saved successfully", customize });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error saving canvas data" });
    }
  },

  productDetailsCustomConfirm: async (req, res) => {
    try {
      const { productId, status } = req.body;
      const userId = req.session.user;

      const customize = await Customize.findOne({ userId: userId });
      let foundProduct = false;

      console.log(productId, status, customize, userId, foundProduct, "this is hte message from the backend");

      customize.products.forEach((item) => {
        if (item.productId.toString() === productId.toString()) {
          item.customizedProductOption = status;
          foundProduct = true;
        }
      });

      console.log(foundProduct, "the product has found");
      if (foundProduct) {
        await customize.save();
        res.json({ message: "Customized product seleted" });
      } else {
        res.json({ message: "Your product is not customized" });
      }
    } catch (error) {
      res.status(500).json({ message: "Interal server error" });
    }
  },
};
