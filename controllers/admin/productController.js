const sharp = require("sharp");

const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");

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
      
      console.log("add product",req.body)
      // Render the form with categories data
      res.render('admin/products/add-product', { categories });
      


    } catch (error) {
        console.log(error.message);
    }
   
},

async addProducts(req, res) {

  console.log("22222222222222222")

    console.log("add product req.files",req.files)
     console.log("add product",req.body)

     try {
        const {productName,productdescription,brandname,price,quantity,color,category}= req.body
      
        const productExists = await Product.findOne({ name:productName })
        if (!productExists) {
            const images = []
            if (req.files && req.files.length > 0) {
                for (let i = 0; i < req.files.length; i++) {
                    images.push(req.files[i].filename);
                }
            }

            const newProduct = new Product({
                name:productName,
                description: productdescription,
                brand: brandname,
                category,
                regularprice:price,
                price:price,
                quantity:quantity,
                color:color,
                image: images
            })
            await newProduct.save()
            res.json({isvalid:true});
            
        } else {

            res.json({isvalid:false});
        }

    } catch (error) {
        console.log(error);
        res.status(500).json({message: error.message});

    }

  
},

  getEditProducts: async (req, res) => {
    const locals = {
      title: "Edit Product",
    };

    const product = await Product.findById(req.params.id).populate(
      "categoryid"
    );
    const categories = await Category.find({ isListed: true });
    const brands = await Brand.find({ isListed: true }); // Assuming you have a `Brand` model
    const breadcrumbs = [
      { name: "Home", url: "/admin" },
      { name: "Products", url: "/admin/products" },
      { name: "Edit Product", url: `/admin/products/edit/${req.params.id}` },
    ];

    res.render("admin/products/edit-product", {
      locals,
      product,
      categories,
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
      let primaryImage =
        product.image.find(
          (img) => img.name === req.files.primaryImage[0]?.filename
        ) || {};
      if (req.files.primaryImage) {
        primaryImage = {
          name: req.files.primaryImage[0].filename,
          path: req.files.primaryImage[0].path,
        };
        await sharp(primaryImage.path)
          .resize(500, 500)
          .toFile(
            path.join(
              __dirname,
              "../../public/uploads/products-images/crp/",
              primaryImage.name
            )
          );
      }

      // Handle secondary images
      let secondaryImages =
        product.image.filter(
          (img) => img.name !== req.files.primaryImage[0]?.filename
        ) || [];
      if (req.files.images) {
        req.files.images.forEach(async (file) => {
          secondaryImages.push({ name: file.filename, path: file.path });
          await sharp(file.path)
            .resize(500, 500)
            .toFile(
              path.join(
                __dirname,
                "../../public/uploads/products-images/crp/",
                file.filename
              )
            );
        });
      }

      const updateProduct = {
        name: req.body.productName.toLowerCase(),
        brand: req.body.brandName,
        category: req.body.categoryName,
        description: req.body.productDespt,
        quantity: req.body.productStock,
        price: req.body.price,
        regularprice: req.body.regularPrice,
        offerpercentage: req.body.offerPercentage || 0,
        color: req.body.color.split(","), // Assuming color is a comma-separated string
        image: [primaryImage, ...secondaryImages],
      };

      await Product.findByIdAndUpdate(productId, updateProduct, { new: true });
      req.flash("success", "Product edited successfully");
      res.redirect("/admin/products");
    } catch (error) {
      console.error(error);
      req.flash("error", error.message);
      return res.redirect(`/admin/products/edit/${productId}`);
    }
  },

  listOrUnlistProduct: async (req, res) => {
    const productId = req.body.productId;
    const shouldList = req.body.shouldList;

    try {
      const product = await Product.findById(productId);
      if (!product) {
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      }

      product.isActive = shouldList;
      await product.save();

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

      const product = await Product.findById(productId);
      if (!product) {
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      }

      await Product.findByIdAndDelete(productId);
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
        .populate("categoryid")
        .skip(perPage * (page - 1))
        .limit(perPage)
        .exec();
      const count = await Product.countDocuments({});
      const nextPage = page + 1;
      const hasNextPage = nextPage <= Math.ceil(count / perPage);

      const breadcrumbs = [
        { name: "Home", url: "/admin" },
        { name: "Products", url: "/admin/products" },
        { name: "Stock", url: "/admin/products/stocks" },
        { name: `Page ${page}`, url: `/admin/products/stocks?page=${page}` },
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

      await Product.findByIdAndUpdate(productId, { quantity: newStock });
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.redirect("/products");
      res.json({ success: false });
    }
  },
};
