const multer = require('multer');
const path = require('path');

// Specific storage configuration for product images
const productStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../../public/uploads/images")); // Destination folder
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // File naming convention
  }
});

// Define the file filter
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

// Initialize upload middleware for single file upload
const productUpload = multer({
  storage: productStorage,
  limits: { fileSize: 1 * 1024 * 1024 }, // 1MB file size limit
  fileFilter: productFileFilter
});

module.exports = {
  productUpload
};
