const multer = require("multer");
const path = require("path");
const fs = require("fs")

const productStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../public/uploads/images"));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, extension);
    cb(null, baseName + "-" + uniqueSuffix + extension);
  },
});

const bannerStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const folderName = `banner-${Date.now()}`;
    const uploadPath = path.join(__dirname, "../../public/uploads/banners", folderName);
    
    // Ensure the folder is created if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    // Set the folder to store uploaded files
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Use original file name
  }
});

const productFileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|webp|svg|avif|gif|/; // Allowed file types
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error("Error: Images Only!"));
  }
};

const productUpload = multer({
  storage: productStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: productFileFilter,
});

const bannerUpload = multer({
  storage: bannerStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
})

module.exports = {
  productUpload,
  bannerUpload,
};
