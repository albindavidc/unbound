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

      let perPage = 5;
      let page = parseInt(req.query.page) || 1;

      const searchQuery = search
        ? {
            $or: [{ name: { $regex: ".*" + search + ".*", $options: "i" } }, { description: { $regex: ".*" + search + ".*", $options: "i" } }],
          }
        : {};

      const product = await Product.find(searchQuery)
        .populate("category")
        .skip((page - 1) * perPage)
        .limit(perPage)
        .sort({ createdAt: -1 })
        .exec();

      const count = await Product.countDocuments(searchQuery);

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
        search,
      });
    } catch (error) {
      console.error(error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: "Internal server error" });
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
        }),
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
          await Product.updateOne({ _id: newProduct._id }, [
            {
              $set: {
                sellingPrice: Math.round(newProductOfferSellingPrice),
              },
            },
          ]);
        } else {
          await Product.updateOne({ _id: newProduct._id }, [
            {
              $set: {
                sellingPrice: Math.round(newCategoryOfferSellingPrice),
              },
            },
          ]);
        }

        res.json({ isvalid: true });
      } else {
        res.json({ isvalid: false });
      }
    } catch (error) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
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
        return res.status(HTTP_STATUS.NOT_FOUND).json({ isvalid: false, message: "Product not found" });
      }

      const files = req.files || {};
      const baseUploadPath = path.join(__dirname, "../../public/uploads/images/");

      // Handle primary image
      let primaryImages = product.primaryImages || [];
      if (files.primaryImage && files.primaryImage.length > 0) {
        const inputPath = files.primaryImage[0].path;
        const outputPath = path.join(baseUploadPath, files.primaryImage[0].filename);

        // Delete the old primary image if it exists
        if (primaryImages.length > 0) {
          const oldPrimaryImage = primaryImages[0];
          const oldPath = path.join(baseUploadPath, oldPrimaryImage.name);
          if (fs.existsSync(oldPath)) {
            try {
              fs.unlinkSync(oldPath);
            } catch (err) {
              console.warn("Failed to delete old primary image:", err.message);
            }
          }
        }

        if (inputPath === outputPath) {
          const buffer = await sharp(inputPath).resize(500, 500).toBuffer();
          await fs.promises.writeFile(outputPath, buffer);
        } else {
          await sharp(inputPath).resize(500, 500).toFile(outputPath);
        }

        primaryImages = [
          {
            name: files.primaryImage[0].filename,
            path: outputPath,
          },
        ];
      }

      let secondaryImages = product.secondaryImages || [];

      // Secondary Image Handling
      const deleteAndUpdateSecondaryImage = async (imageIndex) => {
        const key = `secondaryImage${imageIndex}`;
        if (!files[key] || files[key].length === 0) return;

        if (secondaryImages[imageIndex]) {
          const oldSecondaryImage = secondaryImages[imageIndex];
          const oldSecondaryPath = path.join(baseUploadPath, oldSecondaryImage.name);
          if (fs.existsSync(oldSecondaryPath)) {
            try {
              fs.unlinkSync(oldSecondaryPath);
            } catch (err) {
              console.warn("Failed to delete old secondary image:", err.message);
            }
          }
        }

        const inputPath = files[key][0].path;
        const newImagePath = path.join(baseUploadPath, files[key][0].filename);
        if (inputPath === newImagePath) {
          const buffer = await sharp(inputPath).resize(500, 500).toBuffer();
          await fs.promises.writeFile(newImagePath, buffer);
        } else {
          await sharp(inputPath).resize(500, 500).toFile(newImagePath);
        }

        secondaryImages[imageIndex] = {
          name: files[key][0].filename,
          path: newImagePath,
        };
      };

      for (let i = 0; i < 4; i++) {
        await deleteAndUpdateSecondaryImage(i);
      }

      // Process variants safely
      const variants = req.body.variants || [];
      const rawVariants = Array.isArray(variants) ? variants : Object.values(variants);
      const processedVariants = rawVariants.map((variant) => {
        const colorId = typeof variant.color === "object" ? variant.color?._id : variant.color;
        const sizeId = typeof variant.size === "object" ? variant.size?._id : variant.size;
        const stockNum = parseInt(variant.stock, 10) || 0;

        const existingVariant = product.variants
          ? product.variants.find(
              (v) =>
                (v.color ? String(v.color._id || v.color) : "") === String(colorId) &&
                (v.size ? String(v.size._id || v.size) : "") === String(sizeId),
            )
          : null;

        return {
          _id: existingVariant ? existingVariant._id : new mongoose.Types.ObjectId(),
          color: colorId,
          size: sizeId,
          stock: stockNum,
        };
      });

      const updateProduct = {
        name: req.body.name,
        isActive: req.body.status === "true" || req.body.status === true,
        description: req.body.description ? req.body.description.trim() : "",
        actualPrice: Number(req.body.actualPrice) || 0,
        bundlePrice: Number(req.body.bundlePrice) || 0,
        quantity: Number(req.body.quantity) || 0,
        bundleQuantity: Number(req.body.bundleQuantity) || 0,
        variants: processedVariants,
        offerDiscountRate: Number(req.body.offerDiscountRate) || 0,
        category: req.body.category,
        brand: req.body.brand,
        primaryImages,
        secondaryImages,
      };

      await Product.findByIdAndUpdate(productId, updateProduct, { new: true });

      // Calculate Offer & Selling Price
      const categoryId = req.body.category;
      const catOffer = categoryId ? await Category.findById(categoryId, { categoryOffer: 1 }) : null;
      const categoryOffer = catOffer ? catOffer.categoryOffer || 0 : 0;
      const productOffer = Number(req.body.offerDiscountRate) || 0;
      const actualPriceNum = Number(req.body.actualPrice) || 0;

      const newProductOfferSellingPrice = actualPriceNum * (1 - productOffer / 100);
      const newCategoryOfferSellingPrice = actualPriceNum * (1 - categoryOffer / 100);

      const finalSellingPrice = Math.round(Math.min(newProductOfferSellingPrice, newCategoryOfferSellingPrice));

      await Product.findByIdAndUpdate(productId, { $set: { sellingPrice: finalSellingPrice } });

      req.flash("success", "Product edited successfully");
      return res.json({ isvalid: true });
    } catch (error) {
      console.error("Error updating product:", error);
      if (!res.headersSent) {
        return res.json({ isvalid: false, message: error.message });
      }
    }
  },

  listOrUnlistProduct: async (req, res) => {
    const productId = req.body.productId;
    const shouldList = req.body.shouldList;

    try {
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "Product not found" });
      }

      product.isActive = shouldList;
      await product.save();

      return res.status(HTTP_STATUS.OK).json({ success: true, message: "Product status updated" });
    } catch (error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error", error });
    }
  },

  deleteProduct: async (req, res) => {
    try {
      const productId = req.body.productId;

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "Product not found" });
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
      return res.status(HTTP_STATUS.OK).json({ success: true, message: "Product successfully deleted" });
    } catch (error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error", error });
    }
  },

  deleteImage: async (req, res) => {
    try {
      const { productId, imageId } = req.query;
      const product = await Product.findById(productId);

      if (!product) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "Product not found" });
      }

      let imageDeleted = false;

      // Check primary images
      if (product.primaryImages) {
        const primaryIndex = product.primaryImages.findIndex((img) => img.name === imageId);
        if (primaryIndex !== -1) {
          product.primaryImages.splice(primaryIndex, 1);
          imageDeleted = true;
        }
      }

      // Check secondary images
      if (!imageDeleted && product.secondaryImages) {
        const secondaryIndex = product.secondaryImages.findIndex((img) => img.name === imageId);
        if (secondaryIndex !== -1) {
          product.secondaryImages.splice(secondaryIndex, 1);
          imageDeleted = true;
        }
      }

      if (imageDeleted) {
        await product.save();
        const imagePath = path.join(__dirname, "../../public/uploads/images/", imageId);
        if (fs.existsSync(imagePath)) {
          try {
            fs.unlinkSync(imagePath);
          } catch (err) {
            console.warn("Failed to delete image file from disk:", err.message);
          }
        }
        return res.status(HTTP_STATUS.OK).json({ success: true, message: "Image deleted successfully" });
      } else {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "Image not found" });
      }
    } catch (error) {
      console.error("Error in deleteImage:", error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error" });
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
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: "Internal server error" });
    }
  },

  updateStock: async (req, res) => {
    try {
      const { variantId, stock } = req.body;

      const product = await Product.findOneAndUpdate(
        { "variants._id": variantId },
        { $set: { "variants.$.stock": parseInt(stock, 10) } },
        { new: true },
      );

      if (!product) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Product not found." });
      }

      await product.save();

      res.json({
        message: "Stock updated successfully.",
        product: product,
      });
    } catch (error) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: "An error occurred while updating the stock." });
    }
  },
};
