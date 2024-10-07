const Banner = require("../../models/bannerSchema");

module.exports = {
  getAllBanner: async (req, res) => {
    try {
        const banners = await Banner.find();
      res.render("admin/banner",{banners});
    } catch (error) {}
  },

  addBanner: async (req, res) => {
    try {
    } catch (error) {}
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
