const Banner = require('../../models/bannerSchema')

module.exports = {
    getBanner: async (req, res) =>{
        try {
            res.render("admin/banner")
        } catch (error) {
            
        }
    }
}