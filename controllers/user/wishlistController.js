const Wishlist = require("../../models/wishlistSchema");
const Product = require("../../models/productSchema");

module.exports = {
  getWishlist: async (req, res) => {
    try {
      userId = req.session.user;

      // Populate the product variants as well
      const wishlist = await Wishlist.find({ userId }).populate("products.productId products.addedOn products.productId.variants");

      let products = []; // Collect all product IDs
      let allStocks = []; // Collect all stocks

      // Iterating through the wishlist items to collect product IDs and stock data
      wishlist.forEach((wish) => {
        wish.products.forEach((product) => {
          products.push(product.productId); // Collect the product ID

          // Collect the stocks for each variant of the product
          product.productId.variants.forEach((variant) => {
            allStocks.push(variant.stock);
          });
        });
      });

      // Fetch all products based on the collected product IDs
      const product = await Product.find({ _id: { $in: products.map((p) => p._id) } });

      let variants ;
      product.forEach(product =>{
        variants = product.variants
      })

      console.log("this is variants",variants)

      res.render("user/wishlist", { wishlist, user: userId, product,variants, stocks: allStocks });
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
