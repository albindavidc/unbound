const multer = require('multer');
const path = require('path');

// General storage configuration for images
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, path.join(__dirname, '../../public/uploads/images/'));
//   },
//   filename: (req, file, cb) => {
//     const uniqueName = Date.now() + '-' + file.originalname;
//     cb(null, uniqueName);
//   },
// });

// Specific storage configuration for product images
const productStorage = multer.diskStorage({
  destination: function (req, file, cb) {
      cb(null, 'public/uploads/products/');
  },
  filename: function (req, file, cb) {
      cb(null, Date.now() + path.extname(file.originalname));
  }
});

const productUpload = multer({
  storage: productStorage,
  limits: { fileSize: 1000000 }, // 1MB file size limit
  fileFilter: (req, file, cb) => {
      checkFileType(file, cb);
  }
});


function checkFileType(file, cb) {
  const filetypes = /jpeg|jpg|png|gif/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
      return cb(null, true);
  } else {
      cb('Error: Images Only!');
  }
}


module.exports = {
  // upload: multer({ storage: storage }),
  productUpload,
};
