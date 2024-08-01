const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination : ( req, file, cb ) => {
      cb( null, path.join(__dirname,'../../public/uploads/images/'))
  },
  filename : ( req, file, cb ) => {
      const uniqueName = Date.now() + '-' + file.originalname
      cb( null, uniqueName )
  }
})

const productStorage = multer.diskStorage({
  destination : ( req, file, cb ) => {
      cb( null, path.join(__dirname,'../../public/uploads/product-images/'))
  },
  filename : ( req, file, cb ) => {
      const uniqueName = Date.now() + '-' + file.originalname
      cb( null, uniqueName )
  }
})




module.exports = {
  upload: multer({storage : storage}),
  productUpload: multer({storage : productStorage}),

};
