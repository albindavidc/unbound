// attributeController.js

const Product = require("../../models/productSchema");
const Color = require("../../models/attributes/colorSchema");
const Size = require("../../models/attributes/sizeSchema");
const Brand = require("../../models/attributes/brandSchema");

module.exports = {
  getAttributes: async (req, res) => {
    const colors = await Color.find();
    const sizes = await Size.find();
    const brands = await Brand.find();
    console.log(brands);
    res.render("admin/attributes/attributes", {
      colors,
      sizes,
      brands,
    });
  },

  // Get Attribute
  getColor: async (req, res) => {
    let id = req.params.id;
    try {
      const color = await Color.findById(id);
      if (color) {
        res.status(200).json(color);
      } else {
        res.status(404).json({ error: "Color not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch color" });
    }
  },

  // Get Size
  getSize: async (req, res) => {
    let id = req.params.id;
    try {
      const size = await Size.findById(id);
      if (size) {
        res.status(200).json(size);
      } else {
        res.status(404).json({ error: "Size not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch size" });
    }
  },

  // Get Brand
  getBrand: async (req, res) => {
    let id = req.params.id;
    try {
      const brand = await Brand.findById(id);
      if (brand) {
        res.status(200).json(brand);
      } else {
        res.status(404).json({ error: "Size not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch brand" });
    }
  },

  // Add Color Attributes
  addColor: async (req, res) => {
    console.log(req.body);
    try {
      const { color, colorHex } = req.body;
      const existingColor = await Color.findOne({
        $or: [{ name: color.toLowerCase() }, { hex: colorHex }],
      });

      if (existingColor) {
        return res.status(400).json({ success: false, message: "Color name or hex already exists" });
      }

      if (color && colorHex) {
        const newColor = new Color({
          name: color.toLowerCase(),
          hex: colorHex,
        });
        await newColor.save();
        res.status(200).json({ success: true, message: "Color added successfully" });
      } else {
        res.status(400).json({ success: false, message: "Missing color name or hex" });
      }
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to add color" });
    }
  },

  // Add Size Attribute
  addSize: async (req, res) => {
    console.log(req.body);
    try {
      const { size } = req.body;

      const existingSize = await Size.findOne({ value: size });

      if (existingSize) {
        console.log(existingSize);
        return res.status(400).json({ success: false, message: "Size already exists" });
      }

      if (size) {
        const newSize = new Size({
          value: size,
        });

        await newSize.save();
        return res.status(200).json({ success: true, message: "Size added successfully" });
      }

      return res.status(400).json({ success: false, message: "Size is required" });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Failed to add size" });
    }
  },

  // Add Brand Attribute
  addBrand: async (req, res) => {
    console.log(req.body);
    try {
      const { brand } = req.body;

      if (brand) {
        const existingBrand = await Brand.findOne({
          name: brand.toLowerCase(),
        });

        if (existingBrand) {
          return res.status(400).json({ success: false, message: "Brand already exists" });
        } else {
          const newBrand = new Brand({
            name: brand.toLowerCase(),
            isActive: true,
          });

          await newBrand.save();
          return res.status(200).json({ success: true, message: "Brand added successfully" });
        }
      } else {
        return res.status(400).json({ success: false, message: "Brand name is required" });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: "Failed to add brand" });
    }
  },

  // Edit Color Attributes
  editColor: async (req, res) => {
    let id = req.params.id;
    const { colorName, colorHex } = req.body;
    try {
      const color = await Color.findByIdAndUpdate(
        id,
        {
          name: colorName.toLowerCase(),
          hex: colorHex,
        },
        { new: true }
      );
      if (color) {
        req.flash("success", "Editted Color attribute");
        res.redirect("/admin/attributes");
      } else {
        req.flash("error", "Editted Color attribute");
        res.redirect("/admin/attributes");
      }
    } catch (error) {
      req.flash("error", "Failed to edit color");
      res.redirect("/admin/attributes");
    }
  },

  // Edit Size Attribute
  editSize: async (req, res) => {
    let id = req.params.id;
    const { size } = req.body;
    try {
      const sizeAttr = await Size.findByIdAndUpdate(
        id,
        {
          value: size,
        },
        { new: true }
      );
      if (sizeAttr) {
        req.flash("success", "Editted Size attribute");
        res.redirect("/admin/attributes");
      } else {
        req.flash("error", "Failed to edit size, Size not found");
        res.redirect("/admin/attributes");
      }
    } catch (error) {
      req.flash("error", "Failed to edit size, Internal server error");
      res.redirect("/admin/attributes");
    }
  },

  // Edit Brand Attribute
  editBrand: async (req, res) => {
    let id = req.params.id;
    const { brand } = req.body;
    try {
      const newBrand = await Brand.findByIdAndUpdate(
        id,
        {
          name: brand.toLowerCase(),
        },
        { new: true }
      );
      if (newBrand) {
        req.flash("success", "Editted Brand attribute");
        res.redirect("/admin/attributes");
      } else {
        req.flash("error", "Failed to edit brand, Brand not found");
        res.redirect("/admin/attributes");
      }
    } catch (error) {
      req.flash("error", "Failed to edit brand, Internal server error");
      res.redirect("/admin/attributes");
    }
  },

  // Hard Delete Attributes
  deleteColor: async (req, res) => {
    let id = req.params.id;
    try {
      const productCount = await Product.countDocuments({
        "variants.color": id,
      });

      if (productCount > 0) {
        return res.status(400).json({ success: false, message: "Color is in use by some products" });
      } else {
        const result = await Color.findByIdAndDelete(id);
        if (result) {
          return res.status(200).json({ success: true, message: "Color deleted successfully" });
        } else {
          return res.status(404).json({ success: false, message: "Color not found" });
        }
      }
    } catch (error) {
      return res.status(500).json({ error: "Failed to delete color" });
    }
  },
  deleteSize: async (req, res) => {
    let id = req.params.id;
    try {
      const productUsingSize = await Product.findOne({ "variants.size": id });

      if (productUsingSize) {
        return res.status(400).json({ success: false, message: "Size is in use by a product" });
      } else {
        const result = await Size.findByIdAndDelete(id);
        if (result) {
          res.status(200).json({ success: true, message: "Size deleted successfully" });
        } else {
          res.status(404).json({ success: false, message: "Size not found" });
        }
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to delete size" });
    }
  },
  deleteBrand: async (req, res) => {
    let id = req.params.id;
    try {
      const productsUsingBrand = await Product.find({ brand: id });

      if (productsUsingBrand.length > 0) {
        return res.status(400).json({ success: false, message: "Brand is in use by some products" });
      } else {
        const result = await Brand.findByIdAndDelete(id);
        if (result) {
          res.status(200).json({ success: true, message: "Brand deleted successfully" });
        } else {
          res.status(404).json({ success: false, message: "Brand not found" });
        }
      }
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to delete brand" });
    }
  },

  // Soft Delete Attributes
  toggleListingColor: async (req, res) => {
    let id = req.params.id;
    try {
      const color = await Color.findById(id);
      if (color) {
        color.isDeleted = !color.isDeleted;
        await color.save();
        let status = color.isDeleted ? "Unlisted" : "Listed";
        res.status(200).json({
          color: color,
          message: `The Color : ${color.name} is ${status}`,
        });
      } else {
        res.status(404).json({ error: "Color not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to toggle listing status" });
    }
  },
  toggleListingSize: async (req, res) => {
    let id = req.params.id;
    try {
      const size = await Size.findById(id);
      if (size) {
        size.isDeleted = !size.isDeleted;
        await size.save();
        let status = size.isDeleted ? "Unlisted" : "Listed";
        res.status(200).json({
          size: size,
          message: `The Size : ${size.value} is ${status}`,
        });
      } else {
        res.status(404).json({ error: "Size not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to toggle listing status" });
    }
  },
  toggleListingBrand: async (req, res) => {
    let id = req.params.id;
    try {
      const brand = await Brand.findById(id);
      if (brand) {
        brand.isActive = !brand.isActive;
        await brand.save();
        let status = brand.isActive ? "Unlisted" : "Listed";
        res.status(200).json({
          brand: brand,
          message: `The Brand : ${brand.name} is ${status}`,
        });
      } else {
        res.status(404).json({ error: "Size not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to toggle listing status" });
    }
  },
};
