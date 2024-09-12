const Wishlist = require("../../models/wishlistSchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");

module.exports = {
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

          // Collect the stocks for each variant of the product
          product.productId.variants.forEach((variant) => {
            allStocks = variant.stock;
          });
        });
      });

      // Fetch all products based on the collected product IDs
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
      console.log("this is existing quantity in cart", existingQuantity);

      res.render("user/wishlist", { wishlist, user: userId, product, variants, stocks: allStocks, existingQuantity });
    } catch (error) {
      res.redirect("user/pageNotFound");
      console.log("Internal server Error", error);
    }
  },

  addWishlist: async (req, res) => {
    try {
      const userId = req.session.user;
      const { productId } = req.params;

      console.log("this is backend", productId);
      // Check if the product already exists in the wishlist
      const existingProduct = await Wishlist.findOne({
        userId: req.session.user,
        "products.productId": productId,
      });

      if (existingProduct) {
        console.log("This product already exists in the wishlist.");
        return res.status(404).json({ message: "Product already exists in the wishlist" });
      }

      await Product.updateOne({ _id: productId }, { $set: { wishlist: true } }, { upsert: true });

      console.log("this is backend", userId, productId);
      await Wishlist.findOneAndUpdate(
        { userId }, // Find the wishlist for the given user
        {
          $addToSet: {
            // Add to the array if it does not already exist
            products: {
              productId: productId,
              addedOn: new Date(),
              wishlist: true,
            },
          },
        },
        {
          new: true, // Return the updated document
          upsert: true, // Create a new document if none exists
        }
      );
      res.json({ success: true, message: "You have successfully added the favorates" });
    } catch (error) {
      console.error("Internal server error", error);
    }
  },

  deleteWishlist: async (req, res) => {
    try {
      const userId = req.session.user;
      const { productId } = req.params;

      await Product.updateOne({ _id: productId }, { $set: { wishlist: false } }, { upsert: true });

      // Remove a specific product from the products array
      await Wishlist.updateOne({ userId }, { $pull: { products: { productId: productId } } });

      res.json({ success: true, message: "You have successfully added the favorates" });
    } catch (error) {
      console.error("Internal server error", error);
    }
  },
};
