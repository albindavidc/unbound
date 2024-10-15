// wishlistController.js

const Wishlist = require("../../models/wishlistSchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");

module.exports = {
  // Get Wishlist
  getWishlist: async (req, res) => {
    try {
      const userId = req.session.user;

      // Fetch the user's wishlist, or return an empty list if none exists
      let wishlist = await Wishlist.findOne({ userId }).populate({
        path: "products.productId",
        populate: {
          path: "variants",
          populate: [{ path: "color" }, { path: "size" }],
        },
      });

      // If no wishlist exists for the user, initialize an empty wishlist object
      if (!wishlist) {
        wishlist = { products: [] }; // Empty array of products
      }

      let products = [];
      let allStocks = [];
      let productId;

      // Check if the wishlist contains products
      wishlist.products.forEach((wish) => {
        wish.products.forEach((product) => {
          products.push(product.productId);
          productId = product.productId?._id; // Use optional chaining to prevent error

          if (product.productId && product.productId.variants) {
            product.productId.variants.forEach((variant) => {
              allStocks.push(variant.stock);
            });
          }
        });
      });

      // Fetch product data if productId is defined
      let product = [];
      let variants = [];

      if (productId) {
        product = await Product.find({ _id: productId });
        product.forEach((p) => {
          variants = p.variants;
        });
      }

      // Fetch cart details
      const cart = await Cart.findOne({ userId });
      let existingQuantity = 3; // Default quantity for new users

      if (cart) {
        cart.items.forEach((item) => {
          const existingItem = item.productId.toString() === productId?.toString();
          if (existingItem) {
            existingQuantity = item.quantity;
          }
        });
      }

      // Render wishlist view
      res.render("user/wishlist", {
        wishlist,
        user: userId,
        product,
        variants,
        stocks: allStocks,
        existingQuantity,
      });
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  },

  // Add to Wishlist
  addWishlist: async (req, res) => {
    try {
      const userId = req.session.user;
      const { productId } = req.params;

      const existingProduct = await Wishlist.findOne({
        userId: req.session.user,
        "products.productId": productId,
      });

      if (existingProduct) {
        return res.status(404).json({ message: "Product already exists in the wishlist" });
      }

      await Product.updateOne({ _id: productId }, { $set: { wishlist: true } }, { upsert: true });

      await Wishlist.findOneAndUpdate(
        { userId },
        {
          $addToSet: {
            products: {
              productId: productId,
              addedOn: new Date(),
              wishlist: true,
            },
          },
        },
        {
          new: true,
          upsert: true,
        }
      );
      res.json({ success: true, message: "You have successfully added the favorates" });
    } catch (error) {
      return res.redirect("/pageNotFound");
    }
  },

  // Delete Wishlist
  deleteWishlist: async (req, res) => {
    try {
      const userId = req.session.user;
      const { productId } = req.params;

      await Product.updateOne({ _id: productId }, { $set: { wishlist: false } }, { upsert: true });

      await Wishlist.updateOne({ userId }, { $pull: { products: { productId: productId } } });

      res.json({ success: true, message: "You have successfully added the favorates" });
    } catch (error) {
      console.error("Internal server error", error);
    }
  },
};
