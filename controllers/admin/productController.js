const fs = require("fs");
const path = require("path");

const sharp = require("sharp");

const layout = "./layouts/adminLayout.ejs";
const Product = require("../../models/productSchema")
const Category = require("../../models/categorySchema");
const Color = require("../../models/attributes/colorSchema");
const Size = require("../../models/attributes/sizeSchema");
const Brands = require("../../models/attributes/brandSchema");
const Order = require("../../models/orderSchema");


module.exports = {
  getProductInfo: async (req, res) => {
    let perPage = 9;
    let page = req.query.page || 1;

    const products = await Product.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
    ])
      .skip(perPage * page - perPage)
      .limit(perPage)
      .exec();

    const count = await Product.find().countDocuments();
    const nextPage = parseInt(page) + 1;
    const hasNextPage = nextPage <= Math.ceil(count / perPage);

    res.render("admin/products/products", {
      layout,
      products,
      current: page,
      pages: Math.ceil(count / perPage),
      nextPage: hasNextPage ? nextPage : null,
      currentRoute: "/admin/products/",
    });
  },
  getAddProduct: async (req, res) => {
    const categories = await Category.find({ isActive: true });
    const colors = await Color.find({ isDeleted: false });
    const sizes = await Size.find({ isDeleted: false });
    const brands = await Brands.find({ isActive: false });

    res.render("admin/products/addProduct", {
      layout,
      brands,
      categories,
      colors,
      sizes,
    });
  },
  getEditProduct: async (req, res) => {
    const product = await Product.findById(req.params.id)
      .populate("category")
      .populate("brand");
    const categories = await Category.find({ isActive: true });
    const brands = await Brands.find({ isActive: false });

    // console.log(product);
    res.render("admin/products/editProduct", {
      layout,
      product,
      brands,
      categories,
    });
  },

  addProduct: async (req, res) => {
    try {
      console.log(req.body, req.files);

      // check if the product already exists
      const productExists = await Product.findOne({
        product_name: req.body.product_name.toLowerCase(),
      });
      if (productExists) {
        return res
          .status(400)
          .json({ success: false, message: "Product already exists." });
      }

      const variants = [];

      // Iterate over the keys in the request body
      for (const key in req.body) {
        // Check if the key starts with 'variants['
        if (key.startsWith("variants[")) {
          // Extract the variant index and property from the key
          const match = key.match(/variants\[(\d+)\]\.(.+)/);
          if (match) {
            const index = parseInt(match[1], 10);
            const property = match[2];

            // Initialize the variant object if it doesn't exist
            if (!variants[index]) {
              variants[index] = {};
            }

            // Assign the value to the variant object
            variants[index][property] = req.body[key];
          }
        }
      }
      console.log(variants);

      // Check for duplicate color and size combinations
      const uniqueCombinations = new Set();
      for (const variant of variants) {
        const combination = `${variant.color}-${variant.size}`;
        if (uniqueCombinations.has(combination)) {
          // Duplicate found, respond with an error
          return res.status(400).json({
            success: false,
            message: "Duplicate variant color and size combination found.",
          });
        }
        uniqueCombinations.add(combination);
      }

      let seconaryImages = [];
      req.files.images.forEach((e) => {
        seconaryImages.push({
          name: e.filename,
          path: e.path,
        });
      });

      seconaryImages.forEach(async (e) => {
        await sharp(
          path.join(__dirname, "../../public/uploads/product-images/") + e.name
        )
          .resize(500, 500)
          .toFile(
            path.join(__dirname, "../../public/uploads/product-images/crp/") +
              e.name
          );
      });

      let PrimaryImage;
      req.files.primaryImage.forEach((e) => {
        PrimaryImage = {
          name: e.filename,
          path: e.path,
        };
      });

      await sharp(
        path.join(__dirname, "../../public/uploads/product-images/") +
          PrimaryImage.name
      )
        .resize(500, 500)
        .toFile(
          path.join(__dirname, "../../public/uploads/product-images/crp/") +
            PrimaryImage.name
        );

      

      const product = new Product({
        product_name: req.body.product_name.toLowerCase(),
        brand: req.body.brand,
        markdown1: req.body.description,
        markdown2: req.body.details,
        category: req.body.category,
        variants: variants,
        actualPrice: req.body.actualPrice,
        sellingPrice: req.body.sellingPrice,
        primary_image: PrimaryImage,
        secondary_images: seconaryImages,
      });

      await product.save();
      // Example response for successful creation
      res.status(200).json({
        success: true,
        message: "Product added successfully.",
      });
    } catch (error) {
      // Handle any errors
      console.error(error);
      res.status(500).json({
        success: false,
        message: "Server error.",
      });
    }
  },
  editProduct: async (req, res) => {
    try {
      console.log(req.files, req.body);
      const productId = req.params.id;
      const product = await Product.findById(productId);

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      let primaryImage = product.primary_image;
      let secondaryImages = product.secondary_images;

      if (req.files) {
        if (req.files.primaryImage) {
          primaryImage = {
            name: req.files.primaryImage[0].filename,
            path: req.files.primaryImage[0].path,
          };

          await sharp(
            path.join(__dirname, "../../public/uploads/product-images/") +
              primaryImage.name
          )
            .resize(500, 500)
            .toFile(
              path.join(__dirname, "../../public/uploads/product-images/crp/") +
                primaryImage.name
            );
        }

        if (req.files.image2 || req.files.image3 || req.files.image4) {
          if (req.files.image2) {

            await sharp(
              path.join(__dirname, "../../public/uploads/product-images/") +
                req.files.image2[0].filename
            )
              .resize(500, 500)
              .toFile(
                path.join(
                  __dirname,
                  "../../public/uploads/product-images/crp/"
                ) + req.files.image2[0].filename
              );
          }
          if (req.files.image3) {


            await sharp(
              path.join(__dirname, "../../public/uploads/product-images/") +
                req.files.image3[0].filename
            )
              .resize(500, 500)
              .toFile(
                path.join(
                  __dirname,
                  "../../public/uploads/product-images/crp/"
                ) + req.files.image3[0].filename
              );
          }
          if (req.files.image4) {

            await sharp(
              path.join(__dirname, "../../public/uploads/product-images/") +
                req.files.image4[0].filename
            )
              .resize(500, 500)
              .toFile(
                path.join(
                  __dirname,
                  "../../public/uploads/product-images/crp/"
                ) + req.files.image4[0].filename
              );
          }

          secondaryImages = [
            {
              name: req.files.image2
                ? req.files.image2[0].filename
                : product.secondary_images[0].name,
              path: req.files.image2
                ? req.files.image2[0].path
                : product.secondary_images[0].path,
            },
            {
              name: req.files.image3
                ? req.files.image3[0].filename
                : product.secondary_images[1].name,
              path: req.files.image3
                ? req.files.image3[0].path
                : product.secondary_images[1].path,
            },
            {
              name: req.files.image4
                ? req.files.image4[0].filename
                : product.secondary_images[2].name,
              path: req.files.image4
                ? req.files.image4[0].path
                : product.secondary_images[2].path,
            },
          ];
        }
      }

      // Prepare the update object
      // console.log(req.body);
      const update = {
        product_name: req.body.product_name || product.product_name,
        brand: req.body.brand || product.brand,
        markdown1: req.body.description,
        markdown2: req.body.details,
        description: dompurify.sanitize(marked.parse(req.body.description)),
        details: dompurify.sanitize(marked.parse(req.body.details)),
        category: req.body.category || product.category,
        actualPrice: req.body.actualPrice || product.actualPrice,
        sellingPrice: req.body.sellingPrice || product.sellingPrice,
        isActive: req.body.status || product.isActive,
        primary_image: primaryImage,
        secondary_images: secondaryImages || product.secondary_images,
      };

      // Perform the update operation
      await Product.updateOne({ _id: productId }, update, { new: true });

      req.flash("success", "Product edited successfully");
      res.redirect("/admin/products");
    } catch (error) {
      console.error(error);
      req.flash("error", error.message);
      res.redirect("/admin/products");
    }
  },

  /**
   * Variant Product Stock Management
   */

  getStocks: async (req, res) => {
    try {
      let perPage = 9;
      let page = req.query.page || 1;

      const products = await Product.find()
        .sort({ createdAt: -1 })
        .populate("brand")
        .populate("category")
        .populate("variants.color")
        .populate("variants.size")
        .skip(perPage * page - perPage)
        .limit(perPage)
        .exec();

      const count = await Product.find().countDocuments();
      const nextPage = parseInt(page) + 1;
      const hasNextPage = nextPage <= Math.ceil(count / perPage);

      // console.log(products);
      console.log(products[0]);
      res.render("admin/products/stocks", {
        products,
        layout,
        current: page,
        pages: Math.ceil(count / perPage),
        nextPage: hasNextPage ? nextPage : null,
        currentRoute: "/admin/products/",
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
  updateStock: async (req, res) => {
    try {
      console.log(req.body);
      const { variantId, stock } = req.body;

      // First, check if the product and variant exist
      const product = await Product.findOne({ "variants._id": variantId });
      if (!product) {
        return res
          .status(404)
          .json({ message: "Product or variant not found." });
      }

      // Attempt to update the stock
      const updateVariantStock = await Product.findOneAndUpdate(
        { "variants._id": variantId },
        { $set: { "variants.$.stock": stock } },
        { new: true }
      );

      // Check if the update was successful
      if (updateVariantStock) {
        res.json({
          message: "Stock updated successfully.",
          product: updateVariantStock,
        });
      } else {
        res.status(400).json({ message: "Failed to update stock." });
      }
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: "An error occurred while updating the stock." });
    }
  },

  deleteProduct: async (req, res) => {
    console.log(req.params);

    try {
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      // check if the product is already used in any order
      const orders = await Order.find({ "items.product_id": req.params.id });
      if (orders.length > 0) {
        return res
          .status(400)
          .json({
            message:
              "Cannot delete product as it is used in an order, you can only delete products which are not used in any order",
          });
      }

      // Delete primary image
      if (product.primary_image && product.primary_image.path) {
        fs.unlink(
          path.join(__dirname, "..", product.primary_image.path),
          (err) => {
            if (err) console.error(err);
          }
        );
      }

      // Delete secondary images
      if (product.secondary_images && product.secondary_images.length > 0) {
        product.secondary_images.forEach((image) => {
          fs.unlink(path.join(__dirname, "..", image.path), (err) => {
            if (err) console.error(err);
          });
        });
      }

      // Delete the product from the database
      await Product.deleteOne({ _id: req.params.id });
      res.status(200).json({ message: "Product deleted successfully" });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // List / Unlist - Products (Soft Delete)
  toggleListing: async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      product.isActive = !product.isActive;
      await product.save();
      res.status(200).json({
        message: product.isActive
          ? "Product listed successfully"
          : "Product unlisted successfully",
      });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  },

  // Delete Individual Images
  deleteImage: async (req, res) => {
    try {
      const product = await Product.findById(req.query.productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      const imageId = req.query.imageId; // Assuming you have an imageId query
      let imageToDelete;

      // Check if the image is a primary image
      if (product.primary_image.name === imageId) {
        imageToDelete = product.primary_image;
        product.primary_image.name = ""; // Remove reference to the primary image
        product.primary_image.path = ""; // Remove reference to the primary image
      } else {
        // Check if the image is a secondary image
        const secondaryImageIndex = product.secondary_images.findIndex(
          (image) => image.name === imageId
        );
        if (secondaryImageIndex !== -1) {
          imageToDelete = product.secondary_images[secondaryImageIndex];
          // product.secondary_images.splice(secondaryImageIndex, 1); // Remove the secondary image from the array
          product.secondary_images[secondaryImageIndex].name = "";
          product.secondary_images[secondaryImageIndex].path = "";
        } else {
          return res.status(404).json({ message: "Image not found" });
        }
      }

      // Delete the image file from the server
      fs.unlink(
        path.join(__dirname, "../../public/uploads/product-images") +
          imageToDelete.name,
        (err) => {
          if (err) {
            console.error(err);
            // return res
            //   .status(500)
            //   .json({ message: "Failed to delete image file" });
          }
        }
      );

      // Save the updated product document
      await product.save();
      res.status(200).json({ message: "Image deleted successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // get product details for Offer
  getProdDetails: async (req, res) => {
    const productId = req.params.id;
    try {
      const product = await Product.findOne({ _id: productId });

      if (!product) {
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      }

      return res.status(200).json({ success: true, product });
    } catch (error) {
      console.log(error);
      return res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  },
};
