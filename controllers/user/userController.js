require("dotenv").config();

const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");

const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");

const pageNotFound = async (req, res) => {
  try {
    return res.render("user/page-404");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const loadHomepage = async (req, res) => {
  console.log(req.session.user);

  try {


    if(req.session.user){
      return res.render("user/home", {
        user: req.session.user,
      })
    }else{

    res.render("user/signup");
  }


  } catch (error) {
    console.log(`Home page is not available`);
    res.status(500).send(`Server error`);
  }
};

const loadSignup = async (req, res) => {
  try {

    const user = req.session.user;
    if ((user = req.session.user)) {
      res.render("user/home", { user: req.session.user });
    } else {
      return res.render("user/signup");
    }
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
    return res.render("user/signup");
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

const getFrogotPass = async (req, res) => {
  res.render("user/forgotPassword",);
};


const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "No account found with that email address.",
      });
    }

    const otp = generateOtp(); // Generate OTP
    req.session.userOtp = otp;
    req.session.userData = user; // Store user data in session
    console.log(`OTP Sent: ${otp}`);


    const emailSent = await sendVerificationEmail(email, otp); // Send OTP to email

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP. Please try again.",
      });
    }

    res.render("user/forgot-password-verify-otp" , { email, otp } );
    console.log(`OTP Sent: ${otp}`);
    console.log(`OTP Sent: ${otp}`);
    
  } catch (error) {
    console.error("Error in forgotPassword:", error);
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred. Please try again later.",
    });
  }
};

const forgotPassVerifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    console.log(`OTP Sent: ${otp}`);


    if (!req.session.userOtp || !req.session.userData) {
      return res.status(400).json({
        success: false,
        message: "Session expired, please try again.",
      });
    }

    console.log(`OTP Sent2: ${otp}`);

    if (otp === req.session.userOtp) {
      const user = req.session.userData;

      console.log(`OTP Sent3: ${otp}`);

      // Clear the OTP from the session after successful verification
      // req.session.userOtp = null;

      // Redirect the user to the create new password page
      return res.json({
        success: true,
        redirectUrl: "/forgot-password-cpassword",
        message: "OTP verified, you can now reset your password.",
      });

      
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP, please try again with a recent OTP.",
      });
    }
  } catch (error) {
    console.error("Error Verifying OTP:", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred. Please try again later.",
    });
  }
};

const passwordReset = async (req,res) =>{
  res.render("user/forgot-password-cpassword")
}




const passwordChange = async (req,res) => {
    try {
      const { password, confirmPassword } = req.body;
  
      // Check password strength
      if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 8 characters long and include both letters and numbers",
        });
      }
  
      const user = req.session.userData;
  
      if (!user) {
        return res.status(400).json({
          success: false,
          message: "Session expired or invalid user data",
        });
      }
  
      // Hash the new password
      const passwordHash = await securePassword(password);
  
      // Update the user's password in the database
      const updatedUser = await User.findByIdAndUpdate(
        user._id,
        { password: passwordHash },
        { new: true }
      );
  
      // Clear the OTP and user data from the session
      req.session.userOtp = null;
      delete req.session.userData;
  
      // Set the user session to the updated user ID
      req.session.user = updatedUser._id;
  
      res.redirect("/login");

    } catch (error) {
      console.error("Error updating password: ", error);
      res.status(500).json({
        success: false,
        message: "An unexpected error occurred. Please try again later.",
      });
    }
};



//Logout
const logout = async (req, res) => {
  try {
    
    if(req.user) {
      return req.logOut((err) => {
        if (err) {
          console.log(err);
        } else {
          res.clearCookie("connect.sid");
          res.redirect("/");
        }
      });
    }
    req.session.destroy((err) => {
      if (err) {
        console.log("Session destruction error", err.message);
        return res.redirect("/pageNotFound");
      }
      return res.redirect("/login");
    });
  } catch (error) {
    console.log("Logout error", error);
    res.redirect("/pageNotFound");
  }
};




/**
  *
  User-Profile
 *
***/

const getUserProfile = async (req,res) => {

  
  const userId = req.session.user; 
  
  // Find the user and check if they are blocked
  const user = await User.findOne({ _id: userId, isBlocked: false });

  res.render("user/profile",{
    user : user,
  })

};

const editProfile = async (req, res) => {
  try {


    console.log("userdata",req.session.userData);
    const users = req.session.userData;

    const user = await User.findById(req.session.user);

    const { firstName, phone } = req.body;

    user.name = firstName || user.name;
    // user.lastName = lastName || user.lastName;
    user.phone = phone || user.phone;

    await user.save();

    // Send a success response back to the client
    res.status(200).json({ message: "Profile updated successfully", user });
    console.log("the profile added succcessfully")

  } catch (error) {
    // Handle errors and send an error response
    console.error(error);
    res.status(500).json({
      message: "An error occurred while updating the profile",
      error,
    });
  }
};

const getAddress = async (req, res) => {
  const address = await Address.find({
    customer_id: req.session.user,
    delete: false,
  });
  
  console.log(req.session.user)
  console.log(address);

  res.render("user/address", {
    address,
    user: req.session.user,
  });
};

const addAddress =  async (req, res) => {
  console.log(req.body);
  await Address.create(req.body);
  req.flash("success", "Address Addedd");
  res.redirect("/user/address");
};

const getEditAddress=  async (req, res) => {
  const addressId = req.params.id;

  try {
    const address = await Address.findOne({ _id: addressId });
    if (address) {
      res.status(200).json({ status: true, address });
    } else {
      // Send a  404 status code with a JSON object indicating the address was not found
      res.status(404).json({ status: false, message: "Address not found" });
    }
  } catch (error) {
    // Handle any errors that occurred during the database operation
    console.error(error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};

const editAddress =  async (req, res) => {
  try {
    const addressId = req.params.id;
    const updatedAddress = req.body;

    // Assuming you have a model for addresses, e.g., Address
    const address = await Address.findByIdAndUpdate(
      addressId,
      updatedAddress,
      {
        new: true, // returns the new document if true
      }
    );

    if (!address) {
      return res
        .status(404)
        .send({ message: "Address not found with id " + addressId });
    }

    req.flash("success", "Address Edited");
    res.redirect("/user/address");
  } catch (error) {
    console.error(error);
    req.flash("error", "Error editing address. Please try again.");
    res.redirect("/user/address");
  }
};

const deleteAddress=  async (req, res) => {
  let id = req.params.id;
  try {
    const result = await Address.findByIdAndUpdate(
      id,
      { delete: true },
      { new: true }
    );
    if (result) {
      console.log(result);
      res
        .status(200)
        .json({ message: "Address deleted successfully" });
    } else {
      res.status(404).json({ message: "Address not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};



module.exports = {
  pageNotFound,

  loadHomepage,

  loadSignup,
  signup,
  verifyOtp,
  resendOtp,
  loadLogin,
  login,
  
  getFrogotPass,
  forgotPassword,
  forgotPassVerifyOtp,
  passwordReset,
  passwordChange,

  getUserProfile,
  editProfile,
  getAddress,

  addAddress,
  getEditAddress,
  editAddress,
  deleteAddress,

  
  logout,
};