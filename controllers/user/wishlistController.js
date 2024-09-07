const Wishlist = require("../../models/wishlistSchema");
const Product = require("../../models/productSchema");

module.exports = {
  getWishlist: async (req, res) => {
    try {
      const wishlist = await Wishlist.find().populate("products.productId products.addedOn userId");
      const product = await Product.findById(wishlist.products[0].productId);
      res.render("user/wishlist", { product, wishlist });
    } catch (error) {
      res.redirect("user/pageNotFound");
    }
  },
  addWishlist: async (req, res) => {
    try {
      const userId = req.session.user;
      const { productId } = req.params;

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
      const newWishlist = new Wishlist({
        userId: userId,
        products: [
          {
            productId: productId,
            addedOn: new Date(),
          },
        ],
      });
      await newWishlist.save();
      res.json({ success: true, message: "You have successfully added the favorates" });
    } catch (error) {
      console.error("Internal server error", error);
    }
  },
};
