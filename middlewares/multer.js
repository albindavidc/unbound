const multer = require('multer');
const path = require('path');

const productStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../public/uploads/images")); 
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, extension);
    cb(null, baseName + '-' + uniqueSuffix + extension); 
  }
});

const bannerStorage = multer.diskStorage({
  destination: function(req, file, cb){
    cb(null, path.join(__dirname, '../public/uploads/banner'))
  },
  filename: (req, file, cb) =>{
    const filename = file.originalname
    const uniqueName = Date.now() + '-' + filename;
    cb(null, uniqueName)
  }
})



const productFileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|gif/; // Allowed file types
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error('Error: Images Only!'));
  }
};


const productUpload = multer({
  storage: productStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, 
  fileFilter: productFileFilter
});

const bannerUpload = multer({
  storage: bannerStorage,
  limits: {fileSize: 2* 1024 * 1024},
  fileFilter: productFileFilter
})

module.exports = {
  productUpload,
  bannerUpload
};
