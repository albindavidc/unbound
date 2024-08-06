require("dotenv").config();

const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");

const pageNotFound = async (req, res) => {
  try {
    return res.render("page-404");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const loadHomepage = async (req, res) => {
  try {
    res.render("user/home",{
      user:req.session.user,
    });



    // if (user) {
    //   res.render("user/home", { user: req.session.user });
    // } else {
      
    //   return res.render("user/home");
    // }
  } catch (error) {
    console.log(`Home page is not available`);
    res.status(500).send(`Server error`);
  }
};

const loadSignup = async (req, res) => {
  try {
    return res.render("user/signup");
  } catch (error) {
    console.log("Home page is not loading:", error);
    res.status(500).send("Server Error");
  }
};

// Signup - Generate OTP - Send Verification Email

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email, otp) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Verify your account",
      text: `Your OTP is ${otp}`,
      html: `<b>Your OTP: ${otp}</b>`,
    });

    return info.accepted.length > 0;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

const signup = async (req, res) => {
  try {
    const { name, phone, email, password, cPassword } = req.body;

    if (password !== cPassword) {
      return res.render("user/signup", { message: "Password don't match" });
    }

    const findUser = await User.findOne({ email });
    if (findUser) {
      return res.render("user/signup", {
        message: "User with this email already exists",
      });
    }

    const otp = generateOtp();

    const emailSent = await sendVerificationEmail(email, otp);

    if (!emailSent) {
      return res.json("email-error");
    }

    req.session.userOtp = otp;
    req.session.userData = { name, phone, email, password };

    res.render("user/verify-otp");
    console.log(`OTP Sent: ${otp}`);
  } catch (error) {
    console.error("Signup error", error);
    res.redirect("/pageNotFound");
  }
};

// Secure Password
// Verify OTP ^

const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    console.error("Error hashing password: ", error);
    throw error;
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    console.log(otp);

    if (otp === req.session.userOtp) {
      const user = req.session.userData;
      const passwordHash = await securePassword(user.password);

      const saveUserData = new User({
        name: user.name,
        email: user.email,
        phone: user.phone,
        password: passwordHash,
      });

      if (!req.session.userOtp || !req.session.userData) {
        return res.status(400).json({
          success: false,
          message: "Session expired, please try again.",
        });
      }

      await saveUserData.save();
      req.session.user = saveUserData._id;
      res.json({ success: true, redirectUrl: "/" });
    } else {
      res.status(400).json({
        success: false,
        message: "Invalid OTP, Please try again with recent OTP",
      });
    }
  } catch (error) {
    console.error("Error Verifying OTP", error);
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred. Please try again later.",
    });
  }
};

// Resend OTP
const resendOtp = async (req, res) => {
  try {
    const { email } = req.session.userData;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email not found in session" });
    }

    const otp = generateOtp();
    req.session.userOtp = otp;

    const emailSent = await sendVerificationEmail(email, otp);

    if (emailSent) {
      console.log("Resend OTP: ", otp);
      res
        .status(200)
        .json({ success: true, message: "OTP Resend Successfully" });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to resend OTP. Please try again",
      });
    }
  } catch (error) {
    console.error("Error resending OTP", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error. Please try again",
    });
  }
};

//Load Login - Redirect Login
const loadLogin = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.render("user/signup");
    } else {
      res.render("/");
    }
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const findUser = await User.findOne({ isAdmin: 0, email: email });

    if (!findUser) {
      return res.render("user/signup", { message: "User not found" });
    }

    if (findUser.isBlocked) {
      return res.render("user/signup", {
        message: "User is blocked by the admin",
      });
    }

    const passwordMatch = await bcrypt.compare(password, findUser.password);

    if (!passwordMatch) {
      return res.render("user/signup", {
        message: "Entered Incorrect password",
      });
    }

    req.session.user = findUser._id;

    res.redirect("/");
  } catch (error) {
    console.error("Login error", error);
    res.render("user/signup", {
      message: "Login failed. Please try again later",
    });
  }
};

//Logout
const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log("Session destruction error", err.message);
        return res.redirect("/pageNotFound");
      }
      return res.redirect("/signup");
    });
  } catch (error) {
    console.log("Logout error", error);
    res.redirect("/pageNotFound");
  }
};



// // Load product list
// const loadProductList = async (req, res) => {
//   try {


//     res.render("user/product-list",{
//       user:req.session.user,
//     });

//   } catch (error) {
//     console.error(error);
//     res.status(500).send('An error occurred while loading the product list.');
//   }
// };

// Load product details
const loadProductDetails = async (req, res) => {
  try {
    // const productId = req.query.id; // Assuming the product ID is passed as a query parameter
    // const product = await Product.findById(productId); // Fetch the product details from the database
    // if (!product) {
    //   return res.status(404).send('Product not found.');
    // }
    // res.render('user/product-details', { product }); // Render the product details view with the fetched product

    res.render("user/product-details",{
      user:req.session.user,
    });


  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while loading the product details.');
  }
};


module.exports = {
  loadHomepage,
  pageNotFound,
  loadSignup,
  signup,
  verifyOtp,
  resendOtp,
  loadLogin,
  login,
  logout,

  // loadProductList,
  loadProductDetails,

};
