const Wishlist = require("../../models/wishlistSchema");
const Product = require("../../models/productSchema");

module.exports = {
  getWishlist: async (req, res) => {
    try {
      userId = req.session.user;
      const wishlist = await Wishlist.find().populate("products.productId products.addedOn userId");
      res.render("user/wishlist", { wishlist, user: userId });
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
