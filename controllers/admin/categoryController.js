const Category = require("../../models/categorySchema");

// Fetch category data with pagination and search
const categoryInfo = async (req, res) => {
  try {
    let search = "";
    if (req.query.search) {
      search = req.query.search;
    }

    let page = 1;
    if (req.query.page) {
      page = req.query.page;
    }

    const limit = 4;

    // Fetch category data
    const categoryData = await Category.find({
      $or: [
        { name: { $regex: ".*" + search + ".*", $options: "i" } },
        { description: { $regex: ".*" + search + ".*", $options: "i" } },
      ],
    })
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

    // Count documents
    const count = await Category.find({
      $or: [
        { name: { $regex: ".*" + search + ".*", $options: "i" } },
        { description: { $regex: ".*" + search + ".*", $options: "i" } },
      ],
    }).countDocuments();

    // Calculate total pages
    const totalPages = Math.ceil(count / limit);

    // Render the EJS template with data
    res.render("admin/category", { cat: categoryData, totalPages, currentPage: page });
  } catch (error) {
    console.error('Error fetching category data:', error);
    res.redirect("/pageerror");
  }
};

const addCategory = async (req, res) => {
  const { name, description } = req.body;
  try {
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({ error: "Category already exists" });
    }

    const newCategory = new Category({
      name,
      description,
    });
    await newCategory.save();
    return res.json({ message: "Category added successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

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

const editCategory = async (req, res) => {
  const { id, name, description } = req.body;

  try {
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    category.name = name;
    category.description = description;
    await category.save();

    res.json({ message: "Category update successfully" });
  } catch (error) {
    console.error(error);
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
    console.error('Error listing category:', error);
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
    console.error('Error unlisting category:', error);
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
