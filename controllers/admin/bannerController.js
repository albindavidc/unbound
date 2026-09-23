// bannerController.js

const Banner = require("../../models/bannerSchema");
const fs = require("fs");
const path = require("path");

module.exports = {
  // Get Banner
  getAllBanner: async (req, res) => {
    try {
      const banners = await Banner.find();
      res.render("admin/banner", { banners });
    } catch (error) {}
  },

  // Add Banner
  addBanner: async (req, res) => {
    try {
      if (!req.files || !req.files.banner_images || req.files.banner_images.length === 0) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "No files were uploaded." });
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
        images: uploadedFiles,
      });

      await banner.save();

      return res.json({
        success: true,
        message: "Banner added successfully",
      });
    } catch (error) {
      console.error("Error adding banner:", error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Internal server error",
      });
    }
  },

  // Edit & Delete Banner (Just for Demo)
  editBanner: async (req, res) => {
    try {
    } catch (error) {}
  },
  deleteBanner: async (req, res) => {
    try {
      const bannerId = req.params.id || req.query.id;
      if (!bannerId) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Banner ID is required" });
      }

      const banner = await Banner.findById(bannerId);
      if (!banner) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "Banner not found" });
      }

      // Remove physical banner images from filesystem
      if (banner.images && banner.images.length > 0) {
        banner.images.forEach((image) => {
          if (image.folderName) {
            const folderPath = path.join(__dirname, "../../public/uploads/banners", image.folderName);
            if (fs.existsSync(folderPath)) {
              fs.rmSync(folderPath, { recursive: true, force: true });
            }
          }
        });
      }

      await Banner.findByIdAndDelete(bannerId);

      return res.json({
        success: true,
        message: "Banner deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting banner:", error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Internal server error deleting banner",
      });
    }
  },
};
