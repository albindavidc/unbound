// categoryController.js

const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");

// Get Category
const categoryInfo = async (req, res) => {
  try {
    let search = "";
    if (req.query.search) {
      search = req.query.search;
    }

    let perPage = 10;
    let page = parseInt(req.query.page) || 1;

    const categoryData = await Category.find({
      $or: [{ name: { $regex: ".*" + search + ".*", $options: "i" } }, { description: { $regex: ".*" + search + ".*", $options: "i" } }],
    })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .sort({ createdAt: -1 })
      .exec();

    const count = await Category.find({
      $or: [{ name: { $regex: ".*" + search + ".*", $options: "i" } }, { description: { $regex: ".*" + search + ".*", $options: "i" } }],
    }).countDocuments();

    const nextPage = parseInt(page) + 1;
    const totalPages = Math.ceil(count / perPage);
    const hasPrevPage = page > 1;
    const hasNextPage = page < totalPages;

    res.render("admin/category", {
      cat: categoryData,

      pagination: categoryData,
      currentPage: page,
      perPage,
      nextPage,
      hasPrevPage,
      hasNextPage,
      totalPages,
    });
  } catch (error) {
    res.redirect("/pageerror");
  }
};

// Add Category
const addCategory = async (req, res) => {
  let { name, description, offer } = req.body;

  offer = parseInt(offer);

  try {
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({ error: "Category already exists" });
    }

    const newCategory = new Category({
      name,
      description,
      categoryOffer: offer,
    });

    await newCategory.save();

    const products = await Product.find({ category: newCategory._id });

    //Product offer and category offer
    for (let product of products) {
      const productOffer = product.offerDiscountRate;
      const newProductOfferSellingPrice = product.actualPrice * (1 - productOffer / 100);
      const newCategoryOfferSellingPrice = product.actualPrice * (1 - offer / 100);

      if (newProductOfferSellingPrice < newCategoryOfferSellingPrice) {
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
    }

    return res.json({ message: "Category added successfully" });
  } catch (error) {
    return res.status(500).json({ error: "The first letter has to capital and should not leave any space in between" });
  }
};

// Get Category Details
const getCategoryDetails = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// Edit Category
const editCategory = async (req, res) => {
  const { id, name, description, offer } = req.body;

  try {
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    parseFloat(offer);

    category.name = name;
    category.description = description.trim();
    category.categoryOffer = offer;
    await category.save();

    const products = await Product.find({ category: category._id });

    //Product offer and category offer
    for (let product of products) {
      const productOffer = product.offerDiscountRate;
      const newProductOfferSellingPrice = product.actualPrice * (1 - productOffer / 100);
      const newCategoryOfferSellingPrice = product.actualPrice * (1 - offer / 100);

      if (newProductOfferSellingPrice < newCategoryOfferSellingPrice) {
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
    }

    res.redirect("/admin/category");
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// List Category
const categoryListed = async (req, res) => {
  try {
    let id = req.params.id;
    await Category.updateOne({ _id: id }, { $set: { isListed: true } });
    res.redirect("/admin/category");
  } catch (error) {
    res.redirect("/pageerror");
  }
};

// Unlist Category
const categoryUnlisted = async (req, res) => {
  try {
    let id = req.params.id;
    await Category.updateOne({ _id: id }, { $set: { isListed: false } });
    res.redirect("/admin/category");
  } catch (error) {
    res.redirect("/pageerror");
  }
};

module.exports = {
  categoryInfo,
  addCategory,
  editCategory,
  getCategoryDetails,
  categoryListed,
  categoryUnlisted,
};
