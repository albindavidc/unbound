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
// const Order = require("../../models/orderSchema");

module.exports = {
  getProducts: async (req, res) => {
    const locals = {
      title: "Products",
    };
    try {
      let perPage = 7;
      let page = req.query.page || 1;
      const product = await Product.find()
        .populate("category") // Adjust to populate `categoryid` as it references the `Category` model
        .sort({ createdAt: -1 })
        .skip(perPage * (page - 1))
        .limit(perPage)
        .exec();
      const count = await Product.find().countDocuments({});
      const nextPage = parseInt(page) + 1;
      const hasNextPage = nextPage <= Math.ceil(count / perPage);

      const breadcrumbs = [
        { name: "Home", url: "/admin" },
        { name: "Products", url: "/admin/products" },
        { name: `Page ${page}`, url: `/admin/products?page=${page}` },
      ];

      res.render("admin/products/products", {
        locals,
        product,
        current: page,
        perPage: perPage,
        pages: Math.ceil(count / perPage),
        nextPage: hasNextPage ? nextPage : null,
        breadcrumbs,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  async getAddProducts(req, res) {
    try {
      const categories = await Category.find();
      const brand = await Brand.find();
      const color = await Color.find();
      const size = await Size.find();

      res.render("admin/products/add-product", { categories, brand, color, size });
    } catch (error) {
      console.log(error.message);
    }
  },

  async addProducts(req, res) {
    console.log("add product req.files", req.files);
    console.log("22222222222222222");
    console.log("add product", req.body);

    try {
      const {
        productName,
        productDescription,
        actualPrice,
        sellingPrice,
        bundlePrice,
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
          description: productDescription,
          brand,
          category,
          actualPrice,
          primaryImages,
          secondaryImages,
          variants: processedVariants,
          sellingPrice,
          bundlePrice,
          quantity,
          onOffer:offer,
          offerDiscountPrice,
          offerDiscountRate,
        });
        await newProduct.save();

        res.json({ isvalid: true });
      } else {
        res.json({ isvalid: false });
      }
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  },

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
    const brands = await Brand.find(); // Assuming you have a `Brand` model

    // console.log("this is our brands: ", brands)

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
    console.log("Request body:", req.body);
    console.log("Uploaded files: ", req.files);

    try {
      const productId = req.params.id;
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Handle primary image
      let primaryImages = product.primaryImages || []; // Ensure primaryImages is an array
      if (req.files.primaryImage) {
        const inputPath = req.files.primaryImage[0].path;
        const outputPath = path.join(__dirname, "../../public/uploads/images/", req.files.primaryImage[0].filename);

        console.log("Processing primary image:", inputPath);

        // Delete the old primary image if it exists
        if (primaryImages.length > 0) {
          const oldPrimaryImage = primaryImages[0];
          const oldPath = path.join(__dirname, "../../public/uploads/images/", oldPrimaryImage.name);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
            console.log("Deleted old primary image:", oldPrimaryImage.name);
          }
        }

        const image = await Jimp.read(inputPath);
        await image.resize(500, 500).writeAsync(outputPath);
        console.log("Resized and saved new primary image:", outputPath);

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
            console.log(`Deleted old secondary image ${imageIndex}:`, oldSecondaryImage.name);
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

      if(req.files.secondaryImage1){
        await deleteAndUpdateSecondaryImage(1);
      }

      if(req.files.secondaryImage2){
        await deleteAndUpdateSecondaryImage(2);
      }

      if(req.files.secondaryImage3){
        await deleteAndUpdateSecondaryImage(3);
      }

      // // Handle secondary images
      // let secondaryImages = product.secondaryImages || []; // Maintain existing secondary images
      // if (req.files.secondaryImage) {
      //   // Reset secondaryImages if new images are uploaded
      //   for (const file of secondaryImages) {
      //     const oldPath = path.join(__dirname, "../../public/uploads/images/", file.name);
      //     if (fs.existsSync(oldPath)) {
      //       fs.unlinkSync(oldPath);
      //     }
      //   }

      //   secondaryImages = [];
      //   for (const file of req.files.secondaryImage) {
      //     const inputPath = file.path;
      //     const outputPath = path.join(__dirname, "../../public/uploads/images/", file.filename);

      //     const image = await Jimp.read(inputPath);
      //     await image.resize(500, 500).writeAsync(outputPath);

      //     secondaryImages.push({ name: file.filename, path: outputPath });
      //   }
      // }

      const updateProduct = {
        name: req.body.name.toLowerCase(),
        brand: req.body.brand,
        category: req.body.category,
        description: req.body.description,
        stock: req.body.stock,
        price: req.body.price,
        regularprice: req.body.regularprice,
        offerpercentage: req.body.offerpercentage || 0,
        color: req.body.color.split(","), // Assuming color is a comma-separated string
        primaryImages,
        secondaryImages,
      };

      await Product.findByIdAndUpdate(productId, updateProduct, { new: true });

      req.flash("success", "Product edited successfully");

      res.json({ isvalid: true });
    } catch (error) {
      console.error(error);
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
      console.error("Error updating product status:", error);
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
              console.log("Deleted primary image:", image.name);
            } catch (error) {
              console.error("Error deleting primary image:", error);
            }
          } else {
            console.log("Primary image not found at path:", imagePath);
          }
        }
      }
      // Delete secondary images if they exist
      if (product.secondaryImages && product.secondaryImages.length > 0) {
        for (const secondaryImage of product.secondaryImages) {
          const secondaryImagePath = path.join(__dirname, "../../public/uploads/images/", secondaryImage.name);
          if (fs.existsSync(secondaryImagePath)) {
            fs.unlinkSync(secondaryImagePath);
            console.log("Deleted secondary image:", secondaryImage.name);
          }
        }
      }

      await Product.findByIdAndDelete(productId);
      return res.status(200).json({ success: true, message: "Product successfully deleted" });
    } catch (error) {
      console.error("Error deleting product:", error);
      return res.status(500).json({ success: false, message: "Server error", error });
    }
  },

  //**Product-Stock-Managment */

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
      const { variantId, stock } = req.body; // Assuming productId is passed instead of variantId

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
      console.error(error);
      res.status(500).json({ message: "An error occurred while updating the stock." });
    }
  },
};
