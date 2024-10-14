// productController.js

const path = require("path");
const sharp = require("sharp");
const Jimp = require("jimp");
const { configDotenv } = require("dotenv");
const fs = require("fs");

const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Color = require("../../models/attributes/colorSchema");
const Size = require("../../models/attributes/sizeSchema");
const Brand = require("../../models/attributes/brandSchema");

module.exports = {
  // Get Products
  getProducts: async (req, res) => {
    try {
      let search = "";
      if (req.query.search) {
        search = req.query.search;
      }

      let perPage = 10;
      let page = parseInt(req.query.page) || 1;

      const product = await Product.find()
        .populate("category")
        .skip((page - 1) * perPage)
        .limit(perPage)
        .sort({ createdAt: -1 })
        .exec();

      const count = await Product.find({
        $or: [{ name: { $regex: ".*" + search + ".*", $options: "i" } }, { description: { $regex: ".*" + search + ".*", $options: "i" } }],
      }).countDocuments();

      const nextPage = parseInt(page) + 1;
      const totalPages = Math.ceil(count / perPage);
      const hasPrevPage = page > 1;
      const hasNextPage = page < totalPages;

      res.render("admin/products/products", {
        product,

        pagination: product,
        currentPage: page,
        perPage,
        nextPage,
        hasPrevPage,
        hasNextPage,
        totalPages,
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Get Add Products
  async getAddProducts(req, res) {
    try {
      const categories = await Category.find();
      const brand = await Brand.find();
      const color = await Color.find();
      const size = await Size.find();

      res.render("admin/products/add-product", { categories, brand, color, size });
    } catch (error) {
      return res.redirect("/pageerror");
    }
  },

  async addProducts(req, res) {
    try {
      const {
        productName,
        productDescription,
        actualPrice,
        sellingPrice = "0",
        bundlePrice,
        maxBundle,
        offer,
        offerDiscountPrice,
        offerDiscountRate,
        brand,
        category,
        quantity,
        variants,
      } = req.body;

      // Create arrays for primary and secondary images
      const primaryImages = req?.files?.primaryImage?.map((file) => ({
        name: file.filename,
        path: file.path,
        type: "primary",
      }));

      const secondaryImages = req?.files?.secondaryImage?.map((file) => ({
        name: file.filename,
        path: file.path,
        type: "secondary",
      }));

      // Process variants (assuming you have Color and Size models)
      const processedVariants = await Promise.all(
        variants.map(async (variant) => {
          const { color, size, stock } = variant;
          return {
            color: await Color.findById(color),
            size: await Size.findById(size),
            stock: parseInt(stock, 10), // Ensure stock is a number
          };
        })
      );

      const productExists = await Product.findOne({ name: productName });
      if (!productExists) {
        const images = [];
        if (req.files && req.files.length > 0) {
          for (let i = 0; i < req.files.length; i++) {
            images.push(req.files[i].filename);
          }
        }

        const newProduct = new Product({
          name: productName,
          description: productDescription.trim(),
          brand,
          category,
          actualPrice,
          sellingPrice,
          primaryImages,
          secondaryImages,
          variants: processedVariants,
          bundlePrice,
          quantity,
          bundleQuantity: maxBundle,
          onOffer: offer,
          offerDiscountPrice,
          offerDiscountRate,
        });
        await newProduct.save();

        //Calculate Offer
        const categoryId = req.body.category;
        const catOffer = await Category.findOne({ _id: categoryId }, { categoryOffer: 1 });
        const categoryOffer = catOffer.categoryOffer;

        const productOffer = req.body.offerDiscountRate;

        const newProductOfferSellingPrice = newProduct.actualPrice * (1 - productOffer / 100);
        const newCategoryOfferSellingPrice = newProduct.actualPrice * (1 - categoryOffer / 100);

        if (newProductOfferSellingPrice < newCategoryOfferSellingPrice) {
          await Product.updateOne(
            { _id: newProduct._id }, // Match all products in the given category
            [
              {
                $set: {
                  sellingPrice: Math.round(newProductOfferSellingPrice),
                },
              },
            ]
          );
        } else {
          await Product.updateOne(
            { _id: newProduct._id }, // Match all products in the given category
            [
              {
                $set: {
                  sellingPrice: Math.round(newCategoryOfferSellingPrice),
                },
              },
            ]
          );
        }

        res.json({ isvalid: true });
      } else {
        res.json({ isvalid: false });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Get Edit Products
  getEditProducts: async (req, res) => {
    const locals = {
      title: "Edit Product",
    };

    const product = await Product.findById(req.params.id)
      .populate("category")
      .populate({
        path: "variants",
        populate: [
          {
            path: "color",
            model: "Color",
          },
          {
            path: "size",
            model: "Size",
          },
        ],
      })
      .populate("brand");

    const categories = await Category.find({ isListed: true });
    const colors = await Color.find();
    const sizes = await Size.find();
    const brands = await Brand.find();

    const breadcrumbs = [
      { name: "Home", url: "/admin" },
      { name: "Products", url: "/admin/products" },
      {
        name: "Edit Product",
        url: `/admin/products/edit-product/${req.params.id}`,
      },
    ];

    res.render("admin/products/edit-product", {
      locals,
      product,
      categories,
      colors,
      sizes,
      brands,
      breadcrumbs,
    });
  },

  editProduct: async (req, res) => {
    try {
      const productId = req.params.id;
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Handle primary image
      let primaryImages = product.primaryImages || [];
      if (req.files.primaryImage) {
        const inputPath = req.files.primaryImage[0].path;
        const outputPath = path.join(__dirname, "../../public/uploads/images/", req.files.primaryImage[0].filename);

        // Delete the old primary image if it exists
        if (primaryImages.length > 0) {
          const oldPrimaryImage = primaryImages[0];
          const oldPath = path.join(__dirname, "../../public/uploads/images/", oldPrimaryImage.name);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }

        const image = await Jimp.read(inputPath);
        await image.resize(500, 500).writeAsync(outputPath);

        // Update the primaryImages array
        primaryImages = [
          {
            name: req.files.primaryImage[0].filename,
            path: outputPath,
          },
        ];
      }

      let secondaryImages = product.secondaryImages || []; // Maintain existing secondary images
      const baseUploadPath = path.join(__dirname, "../../public/uploads/images/");

      // Secondary Image Handling
      const deleteAndUpdateSecondaryImage = async (imageIndex) => {
        if (secondaryImages[imageIndex]) {
          const oldSecondaryImage = secondaryImages[imageIndex];
          const oldSecondaryPath = path.join(baseUploadPath, oldSecondaryImage.name);
          if (fs.existsSync(oldSecondaryPath)) {
            fs.unlinkSync(oldSecondaryPath);
          }
        }

        const newImage = await Jimp.read(req.files[`secondaryImage${imageIndex}`][0].path);
        const newImagePath = path.join(baseUploadPath, req.files[`secondaryImage${imageIndex}`][0].filename);
        await newImage.resize(500, 500).writeAsync(newImagePath);
        console.log(`Resized and saved new secondary image ${imageIndex}:`, req.files[`secondaryImage${imageIndex}`][0].filename);

        // Update the corresponding index in the secondaryImages array
        secondaryImages[imageIndex] = {
          name: req.files[`secondaryImage${imageIndex}`][0].filename,
          path: newImagePath,
        };
      };

      // Handle each secondary image separately
      if (req.files.secondaryImage0) {
        await deleteAndUpdateSecondaryImage(0);
      }

      if (req.files.secondaryImage1) {
        await deleteAndUpdateSecondaryImage(1);
      }

      if (req.files.secondaryImage2) {
        await deleteAndUpdateSecondaryImage(2);
      }

      if (req.files.secondaryImage3) {
        await deleteAndUpdateSecondaryImage(3);
      }
      const variants = req.body.variants;

      // First, retrieve the existing product
      const existingProduct = await Product.findById(productId);

      // Process variants (assuming you have Color and Size models)
      const processedVariants = await Promise.all(
        variants.map(async (variant) => {
          const { color, size, stock } = variant;

          // Find an existing variant with the same color and size
          const existingVariant = existingProduct.variants.find((v) => toString(v.color) === toString(color) && toString(v.size) === toString(size));

          return {
            _id: existingVariant ? existingVariant._id : new mongoose.Types.ObjectId(), // Preserve existing _id or create new one
            color: await Color.findById(color), // Ensure valid color ObjectId
            size: await Size.findById(size), // Ensure valid size ObjectId
            stock: parseInt(stock, 10), // Ensure stock is a number
          };
        })
      );

      const updateProduct = {
        name: req.body.name,
        isActive: req.body.status,
        description: req.body.description.trim().trimStart(),
        actualPrice: req.body.actualPrice,
        bundlePrice: req.body.bundlePrice,
        quantity: req.body.quantity,
        bundleQuantity: req.body.bundleQuantity,
        variants: processedVariants,
        offerDiscountRate: req.body.offerDiscountRate,
        category: req.body.category,
        brand: req.body.brand,
        primaryImages,
        secondaryImages,
      };

      await Product.findOneAndUpdate({ _id: productId }, updateProduct, { new: true, upsert: true });

      //Calculate Offer
      const sellingPrice = req.body.sellingPrice;
      const actualPrice = req.body.actualPrice;

      const categoryId = req.body.category;
      const catOffer = await Category.findOne({ _id: categoryId }, { categoryOffer: 1 });
      const categoryOffer = catOffer.categoryOffer;

      const productOffer = req.body.offerDiscountRate;

      const newProductOfferSellingPrice = product.actualPrice * (1 - productOffer / 100);
      const newCategoryOfferSellingPrice = product.actualPrice * (1 - categoryOffer / 100);

      if (Number(newProductOfferSellingPrice) < Number(newCategoryOfferSellingPrice)) {
        await Product.updateOne(
          { _id: product._id }, // Match all products in the given category
          [
            {
              $set: {
                sellingPrice: Math.round(newProductOfferSellingPrice),
              },
            },
          ]
        );
      } else {
        await Product.updateOne(
          { _id: product._id }, // Match all products in the given category
          [
            {
              $set: {
                sellingPrice: Math.round(newCategoryOfferSellingPrice),
              },
            },
          ]
        );
      }

      req.flash("success", "Product edited successfully");

      res.json({ isvalid: true });
    } catch (error) {
      req.flash("error", error.message);

      // Ensure only one response is sent
      if (!res.headersSent) {
        return res.redirect(`/admin/products/edit-product/${req.params.id}`);
      }
    }
  },

  listOrUnlistProduct: async (req, res) => {
    const productId = req.body.productId;
    const shouldList = req.body.shouldList;

    try {
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ success: false, message: "Product not found" });
      }

      product.isActive = shouldList;
      await product.save();

      return res.status(200).json({ success: true, message: "Product status updated" });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Server error", error });
    }
  },

  deleteProduct: async (req, res) => {
    try {
      const productId = req.body.productId;

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ success: false, message: "Product not found" });
      }

      // Delete primary images if they exist
      if (product.primaryImages && product.primaryImages.length > 0) {
        for (const image of product.primaryImages) {
          const imagePath = path.join(__dirname, "../../public/uploads/images/", image.name);
          if (fs.existsSync(imagePath)) {
            try {
              fs.unlinkSync(imagePath);
            } catch (error) {}
          }
        }
      }
      // Delete secondary images if they exist
      if (product.secondaryImages && product.secondaryImages.length > 0) {
        for (const secondaryImage of product.secondaryImages) {
          const secondaryImagePath = path.join(__dirname, "../../public/uploads/images/", secondaryImage.name);
          if (fs.existsSync(secondaryImagePath)) {
            fs.unlinkSync(secondaryImagePath);
          }
        }
      }

      await Product.findByIdAndDelete(productId);
      return res.status(200).json({ success: true, message: "Product successfully deleted" });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Server error", error });
    }
  },

  //**Product-Stock-Managment */

  getStocks: async (req, res) => {
    try {
      let perPage = 9;
      let page = parseInt(req.query.page) || 1;

      const products = await Product.find()
        .sort({ createdAt: -1 })
        .populate("brand")
        .populate("category")
        .populate("variants.color")
        .populate("variants.size")
        .skip((page - 1) * perPage)
        .limit(perPage)
        .sort({ createdAt: -1 })
        .exec();

      const count = await Product.find().countDocuments();
      const nextPage = parseInt(page) + 1;
      const totalPages = Math.ceil(count / perPage);
      const hasPrevPage = page > 1;
      const hasNextPage = page < totalPages;

      res.render("admin/products/stocks", {
        products,

        pagination: products,
        currentPage: page,
        perPage,
        nextPage,
        hasPrevPage,
        hasNextPage,
        totalPages,
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  },

  updateStock: async (req, res) => {
    try {
      const { variantId, stock } = req.body;

      // Attempt to update the stock
      const product = await Product.findOneAndUpdate(
        { "variants._id": variantId },
        { $set: { "variants.$.stock": parseInt(stock, 10) } },
        { new: true }
      );

      if (!product) {
        return res.status(404).json({ message: "Product not found." });
      }

      // Save the updated product
      await product.save();

      // Send a response indicating success
      res.json({
        message: "Stock updated successfully.",
        product: product,
      });
    } catch (error) {
      res.status(500).json({ message: "An error occurred while updating the stock." });
    }
  },
};
