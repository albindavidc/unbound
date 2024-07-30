const Category = require("../../models/categorySchema");

const categoryInfo = async (req,res) => {
    try {
         const page = parseInt(req.query.page) || 1;
         const limit = 4;
         const skip = (page-1)* limit;

         const categoryData = await Category.find({})
         .sort({createdAt: -1})
         .skip(skip)
         .limit(limit);

         const totalCategories = await Category.countDocuments();
         const totalPages = Math.ceil(totalCategories / limit);
         res.render("admin/category", {
            cat:categoryData,
            currentPage: page,
            totalPages : totalPages,
            totalCategories: totalCategories,
         })
    } catch (error) {
        console.error(error);
        res.redirect("/pageerror");
    }
}
const addCategory = async (req,res) => {
    const {name, description} = req.body;
    try {
        
        const existingCategory = await Category.findOne({name});
        if(existingCategory) {
            return res.status(400).json({error: "Category already exists"});
        }

        const newCategory = new Category({
            name,
            description,
        });
        await newCategory.save();
        return res.json({message: "Category added successfully"});

    } catch (error) {
        console.error(error);
        return res.status(500).json({error: "Internal Server Error"});   
    }
}

module.exports = {
    categoryInfo,
    addCategory,
}