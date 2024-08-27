const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Color = require("../../models/attributes/colorSchema");
const Brand = require("../../models/attributes/brandSchema");
const Size = require("../../models/attributes/sizeSchema");

module.exports = {
  // Fetch all products
  loadProductList: async (req, res) => {


       //----------------------------------//
       const { brand, category, sort } = req.query;

       const currentCategoryId = req.query.categoryId; 
      const  currentBrandId = req.query.brandId;
       let query = {};

       console.log(`Sort parameter received: ${sort}`); // Debugging log

       
       if (category && category !== "all") {
         query.category = category;
       }

       if (brand && brand !== "all") {
        query.brand = brand;
      }
 
       let sortQuery = {};
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
         default:
           sortQuery = {}; // No sorting
       }
 
 
       //---------------------------------------//

       

    try {
      const product = await Product.find({ isActive: true }).populate("variants.color"); // Ensure color data is populated

      const categories = await Category.find({});
      const brand = await Brand.find({});
      const size = await Size.find({});
      const colors = await Color.find({ isListed: true });


      //----------------------//
      
      const products = await Product.find(query).sort(sortQuery);
      const productCount = await Product.countDocuments(query);
   
      //--------------------------//


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
        currentCategoryId: currentCategoryId,
        currentBrandId,

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

  // Assuming you are using Express.js

  // getCategory: async (req, res) => {
  //   const { category, sort } = req.query;
  //   let filter = {};

  //   if (category && category !== "all") {
  //     filter.category = category;
  //   }

  //   let sortOption = {};
  //   if (sort === "low-to-high") {
  //     sortOption.sellingPrice = 1;
  //   } else if (sort === "high-to-low") {
  //     sortOption.sellingPrice = -1;
  //   } else if (sort === "a-to-z") {
  //     sortOption.name = 1;
  //   } else if (sort === "z-to-a") {
  //     sortOption.name = -1;
  //   }

  //   const products = await Product.find(filter).sort(sortOption);
  //   const productCount = products.length;

  //   res.render("product-list", { products, productCount });
  // },
};
