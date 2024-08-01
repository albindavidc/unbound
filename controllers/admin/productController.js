const sharp = require("sharp");
const adminLayout = "./layouts/adminLayouts";
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const path = require("path");
const fs = require("fs");
const { configDotenv } = require("dotenv");

module.exports = {
  getProducts: async (req, res) => {
    const locals = {
      title: "Products",
    };
    try {
      let perPage = 7;
      let page = req.query.page || 1;
      const product = await Product.find()
        .populate("category")
        .sort({ createdAt: -1 })
        .skip(perPage * page - perPage)
        .limit(perPage)
        .exec();
      const count = await Product.find().countDocuments({});
      const nextPage = parseInt(page) + 1;
      const hasNextPage = nextPage <= Math.ceil(count / perPage);

      const breadcrumbs = [
        { name: 'Home', url: '/admin' },
        { name: 'Products', url: '/admin/products' },
        { name: `Page ${page}`, url: `/admin/products?page=${page}` }
    ];

      res.render("admin/products/products", {
        locals,
        layout: adminLayout,
        product,
        current: page,
        perPage: perPage,
        pages: Math.ceil(count / perPage),
        nextPage: hasNextPage ? nextPage : null,
        breadcrumbs,
      });
    } catch (error) {
      console.error(error);
    }
  },

  getAddProducts: async (req, res) => {
    const locals = {
      title: "Products",
    };

    
    const categories = await Category.find({ isListed: true });
    const breadcrumbs = [
      { name: 'Home', url: '/admin' },
      { name: 'Products', url: '/admin/products' },
      { name: "Add Product",url: "/add-product" }
  ];

    res.render("admin/products/addProducts", {
      locals,
      layout: adminLayout,
      categories,
      breadcrumbs,
    });
  },

  addProducts: async (req, res) => {

    console.log("111111111111111");
    console.log("222222222222222");
    console.log("3333333333333333");



    console.log(req.body);
    try {
      const existProduct = await Product.findOne({
        name: req.body.productName.toLowerCase(),
      });
      if (existProduct) {
        return res
          .status(400)
          .json({ success: false, message: "Product already exist" });
      }




      // Ensure req.files is defined and contains the expected fields
      if (!req.files || !req.files.images || !req.files.primaryImage) {
        return res
          .status(400)
          .json({ success: false, message: "Images are required" });
      }

      let secondaryImages = [];
      req.files.images.forEach((e) => {
        secondaryImages.push({
          name: e.filename,
          path: e.path,
        });
      });

      secondaryImages.forEach(async (e) => {
        await sharp(
          path.join(__dirname, "../../public/uploads/products-images/") + e.name
        )
          .resize(500, 500)
          .toFile(
            path.join(__dirname, "../../public/uploads/products-images/crp/") +
              e.name
          );
      });

      let primaryImage = [];
      req.files.primaryImage.forEach((e) => {
        primaryImage = {
          name: e.filename,
          path: e.path,
        };
      });




      await sharp(
        path.join(__dirname, "../../public/uploads/products-images/") +
          primaryImage.name
      )
        .resize(500, 500)
        .toFile(
          path.join(__dirname, "../../public/uploads/products-images/crp/") +
            primaryImage.name
        );

      const product = new Product({
        product_name: req.body.productName.toLowerCase(),
        category: req.body.categoryName,
        description: req.body.productDespt,
        stock: req.body.productStock,
        price: req.body.price,
        oldPrice: req.body.oldPrice,
        Colour: req.body.colour,
        displaySize: req.body.displaySize,
        resolution: req.body.resolution,
        Processor: req.body.processor,
        ramSize: req.body.ramSize,
        hardDriveSize: req.body.hdSize,
        hardDiskDescription: req.body.hdDescription,
        graphicsChipsetBrand: req.body.graphics,
        operatingSystem: req.body.os,
        audioDetails: req.body.audioDetails,
        numberofUSB: req.body.usbPort,
        countryofOrigin: req.body.countryofOrigin,
        itemWeight: req.body.weight,
        primaryImages: primaryImage,
        secondaryImages: secondaryImages,
      });

      await product.save();
      req.flash("success", "Product added successfully");
      res.redirect("/admin/products");
    } catch (error) {
      console.log(error);
      //   res.status(500).json({ message: 'Server error' });
      req.flash("error", error.message);
      return res.redirect("/admin/add-product");
    }
  },

  getEditProducts: async (req, res) => {
    const locals = {
      title: "Products",
    };

    const product = await Product.findById(req.params.id).populate("category");
    const categories = await Category.find({ isActive: true });
    const breadcrumbs = [
      { name: 'Home', url: '/admin' },
      { name: 'Products', url: '/admin/products' },
      { name: "Edit Product",url: "/products/editProducts" }
  ];
    res.render("admin/products/editProducts", {
      locals,
      layout: adminLayout,
      product,
      categories,
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
      let primaryImage = product.primaryImages;
      if (req.files.primaryImage) {
        primaryImage = [
          {
            name: req.files.primaryImage[0].filename,
            path: req.files.primaryImage[0].path,
          },
        ];

        await sharp(req.files.primaryImage[0].path)
          .resize(500, 500)
          .toFile(
            path.join(
              __dirname,
              "../../public/uploads/products-images/crp/",
              req.files.primaryImage[0].filename
            )
          );
      }

      // Handle secondary images
      let secondaryImages = [];
      if (req.files.image2) {
        await sharp(req.files.image2[0].path)
          .resize(500, 500)
          .toFile(
            path.join(
              __dirname,
              "../../public/uploads/products-images/crp/",
              req.files.image2[0].filename
            )
          );
        secondaryImages.push({
          name: req.files.image2[0].filename,
          path: req.files.image2[0].path,
        });
      } else if (product.secondaryImages[0]) {
        secondaryImages.push(product.secondaryImages[0]);
      }

      if (req.files.image3) {
        await sharp(req.files.image3[0].path)
          .resize(500, 500)
          .toFile(
            path.join(
              __dirname,
              "../../public/uploads/products-images/crp/",
              req.files.image3[0].filename
            )
          );
        secondaryImages.push({
          name: req.files.image3[0].filename,
          path: req.files.image3[0].path,
        });
      } else if (product.secondaryImages[1]) {
        secondaryImages.push(product.secondaryImages[1]);
      }
      if (req.files.image4) {
        await sharp(req.files.image4[0].path)
          .resize(500, 500)
          .toFile(
            path.join(
              __dirname,
              "../../public/uploads/products-images/crp/",
              req.files.image3[0].filename
            )
          );
        secondaryImages.push({
          name: req.files.image4[0].filename,
          path: req.files.image4[0].path,
        });
      } else if (product.secondaryImages[1]) {
        secondaryImages.push(product.secondaryImages[1]);
      }

      // Update the product
      const updateProduct = {
        product_name: req.body.productName.toLowerCase(),
        category: req.body.categoryName,
        description: req.body.productDespt,
        stock: req.body.productStock,
        price: req.body.price,
        oldPrice: req.body.oldPrice,
        Colour: req.body.colour,
        displaySize: req.body.displaySize,
        resolution: req.body.resolution,
        Processor: req.body.processor,
        ramSize: req.body.ramSize,
        hardDriveSize: req.body.hdSize,
        hardDiskDescription: req.body.hdDescription,
        graphicsChipsetBrand: req.body.graphics,
        operatingSystem: req.body.os,
        audioDetails: req.body.audioDetails,
        numberofUSB: req.body.usbPort,
        countryofOrigin: req.body.countryofOrigin,
        itemWeight: req.body.weight,
        primaryImages: primaryImage,
        secondaryImages: secondaryImages,
      };

      await Product.findByIdAndUpdate(productId, updateProduct, { new: true });
      req.flash("success", "Product edited successfully");
      res.redirect("/admin/products");
    } catch (error) {
      console.error(error);

      res.redirect("/products/editProducts").status(500).json({ message: "Server error" });
    }
  },

  listOrUnlistProduct: async (req, res) => {
    const productId = req.body.productId;
    const shouldList = req.body.shouldList;

    console.log(
      `Received request to ${
        shouldList ? "list" : "unlist"
      } product with ID: ${productId}`
    );

    try {
      const product = await Product.findById(productId);
      if (!product) {
        console.log("Product not found");
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      }

      product.isActive = shouldList;
      await product.save();

      console.log("Product status updated successfully");
      return res
        .status(200)
        .json({ success: true, message: "Product status updated" });
    } catch (error) {
      console.error("Error updating product status:", error);
      return res
        .status(500)
        .json({ success: false, message: "Server error", error });
    }
  },
  deleteProduct: async (req, res) => {
    try {
      const productId = req.body.productId;
      console.log(`Received request to delete product with ID: ${productId}`);

      const product = await Product.findById(productId);
      if (!product) {
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      }

      await Product.findByIdAndDelete(productId);
      console.log("Product successfully deleted");

      return res
        .status(200)
        .json({ success: true, message: "Product successfully deleted" });
    } catch (error) {
      console.error("Error deleting product:", error);
      return res
        .status(500)
        .json({ success: false, message: "Server error", error });
    }
  },

  getStocks: async (req, res) => {
    try {
        const perPage = 7;
        const page = parseInt(req.query.page) || 1;
        const products = await Product.find()
            .sort({ createdAt: -1 })
            .populate("category")
            .skip(perPage * (page - 1))
            .limit(perPage)
            .exec();
        const count = await Product.countDocuments({});
        const nextPage = page + 1;
        const hasNextPage = nextPage <= Math.ceil(count / perPage);

        const breadcrumbs = [
            { name: 'Home', url: '/admin' },
            { name: 'Products', url: '/admin/products' },
            { name: 'Stock', url: '/admin/products/stocks' },
            { name: `Page ${page}`, url: `/admin/products/stocks?page=${page}` }
        ];

        res.render("admin/products/stock", {
            products,
            layout: adminLayout,
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


  updateStocks: async (req, res) => {
    const { productId, newStock } = req.body;

    try {
      if (newStock < 0) {
        return res.json({
          success: false,
          error: "Stock value cannot be negative.",
        });
      }

      await Product.findByIdAndUpdate(productId, { stock: newStock });
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.redirect("/products")
      res.json({ success: false });
    }
  },
};
