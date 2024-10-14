// wishlistController.js

const Wishlist = require("../../models/wishlistSchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");

module.exports = {
  // Get Wishlist
  getWishlist: async (req, res) => {
    try {
      userId = req.session.user;
      const wishlist = await Wishlist.find({ userId }).populate({
        path: "products.productId",
        populate: {
          path: "variants",
          populate: [{ path: "color" }, { path: "size" }],
        },
      });

      let products;
      let allStocks;

      let productId;
      wishlist.forEach((wish) => {
        wish.products.forEach((product) => {
          products = product.productId;
          productId = product.productId;

          product.productId.variants.forEach((variant) => {
            allStocks = variant.stock;
          });
        });
      });

      const product = await Product.find({ _id: productId });

      let variants;
      product.forEach((product) => {
        variants = product.variants;
      });

      const cart = await Cart.findOne({ userId });
      let existingQuantity;
      if (cart) {
        let existingItem;
        cart.items.forEach((item) => {
          cart.items.forEach((item) => {
            existingItem = item.productId.toString() === productId._id.toString();
            existingQuantity = item.quantity;
          });
        });
      } else {
        existingQuantity = 3;
      }

      res.render("user/wishlist", { wishlist, user: userId, product, variants, stocks: allStocks, existingQuantity });
    } catch (error) {
      res.redirect("user/pageNotFound");
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
