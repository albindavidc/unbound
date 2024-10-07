const Banner = require("../../models/bannerSchema");
const fs = require("fs");
const path = require("path");

module.exports = {
  getAllBanner: async (req, res) => {
    try {
      const banners = await Banner.find();
      res.render("admin/banner", { banners });
    } catch (error) {}
  },

  addBanner: async (req, res) => {
    try {
      if (!req.files || !req.files.banner_images || req.files.banner_images.length === 0) {
        return res.status(400).json({ success: false, message: "No files were uploaded." });
      }

      const folderName = `banner-${Date.now()}`;
      const uploadPath = path.join(__dirname, "../../public/uploads/banners", folderName);

      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      const uploadedFiles = [];
      const fileTracker = new Set();

      req.files.banner_images.forEach((bannerFile) => {
        const newFilePath = path.join(uploadPath, bannerFile.filename);

        if (!fileTracker.has(bannerFile.filename)) {
          fs.renameSync(bannerFile.path, newFilePath);

          if (fs.existsSync(bannerFile.path)) {
            fs.unlinkSync(bannerFile.path);
          }

          uploadedFiles.push({
            filename: bannerFile.filename,
            originalname: bannerFile.originalname,
            path: `/uploads/banners/${folderName}/${bannerFile.filename}`,
            folderName: folderName,
          });

          fileTracker.add(bannerFile.filename);
        }
      });

      const banner = new Banner({
        name: req.body.banner_name,
        description: req.body.description,
        reference: req.body.reference,
        images: uploadedFiles,
      });

      await banner.save();

      return res.json({
        success: true,
        message: "Banner added successfully",
      });
    } catch (error) {
      console.error("Error adding banner:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  },

  editBanner: async (req, res) => {
    try {
    } catch (error) {}
  },
  deleteBanner: async (req, res) => {
    try {
    } catch (error) {}
  },
};
