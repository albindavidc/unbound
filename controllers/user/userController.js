// userController.js

require("dotenv").config();

const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Referral = require("../../models/referralSchema");
const Wallet = require("../../models/walletSchema");
const Cart = require("../../models/cartSchema");
const Wishlist = require("../../models/wishlistSchema")

const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const { checkout } = require("../../routes/userRouter");

// Page Not Found
const pageNotFound = async (req, res) => {
  try {
    return res.render("user/page-404");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

// Load Home Page
const loadHomepage = async (req, res) => {
  try {
    
    const userId = req.session.user;
    let cart = await Cart.findOne({ userId });
    let wishlist = await Wishlist.findOne({userId})
    if (!cart) {
      cart = new Cart({ userId });
      await cart.save();
    }
    if (!wishlist) {
      wishlist = new Wishlist({ userId });
      await wishlist.save();
    }

    if (req.session.user) {
      return res.render("user/home", {
        user: req.session.user,
      });
    } else {
      res.render("user/signup");
    }
  } catch (error) {
    res.status(500).send(`Server error`);
  }
};

// Load Signup
const loadSignup = async (req, res) => {
  try {
    const locals = {
      title: "Signup",
    };
    const user = req.session.user;
    if ((user = req.session.user)) {
      res.render("user/home", { user: req.session.user });
    } else {
      return res.render("user/signup",{locals});
    }
  } catch (error) {
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
    return false;
  }
}

// Signup
const signup = async (req, res) => {
  try {
    const { name, phone, email, password, cPassword, referrals, referrer } = req.body;

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
    req.session.userData = { name, phone, email, password, referrals };
    req.session.referrals = { referrals };

    res.redirect("/verify-otp");
  } catch (error) {
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

      if (!req.session.userOtp || !req.session.userData) {
        return res.status(400).json({
          success: false,
          message: "Session expired, please try again.",
        });
      }

      const saveUserData = new User({
        name: user.name,
        email: user.email,
        phone: user.phone,
        password: passwordHash,
      });

      await saveUserData.save();
      req.session.user = saveUserData._id;

      const referrer = await User.findOne({ referralCode: user.referrals });
      const referralCode = req.session.referrals;
      const referrals = await Referral.find();
      let matchingReferral = null;

      for (let i = 0; i < referrals.length; i++) {
        if (referrals[i].referralCode === referralCode.referrals) {
          console.log(referrals[i], "this is referrals");
          matchingReferral = referrals[i];
          break;
        }
      }

      if (matchingReferral !== null) {
        const addReferrals = await Referral.findOneAndUpdate(
          { referrer: matchingReferral.referrer._id },
          { $set: { referralCode: matchingReferral.referralCode }, $push: { referredUserDetails: { user: req.session.user, status: "Active" } } },
          { new: true, upsert: true }
        );

        await User.findOneAndUpdate({ _id: req.session.user }, { $push: { referrals: addReferrals } }, { new: true, upsert: true });
      }
      // else{
      //   addReferrals = await Referral.findOneAndUpdate(
      //     { referrer: referrer._id },
      //     {$set: {referralCode: referrer.referralCode},
      //     $push: {referredUserDetails: {user: req.session.user, status: "Active"}} },
      //     { new: true, upsert: true }
      //   )
      // }

      res.json({ success: true });
    } else {
      res.status(400).json({
        success: false,
        message: "Invalid OTP, Please try again with recent OTP",
      });
    }
  } catch (error) {
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
      return res.status(400).json({ success: false, message: "Email not found in session" });
    }

    const otp = generateOtp();
    req.session.userOtp = otp;

    const emailSent = await sendVerificationEmail(email, otp);

    if (emailSent) {
      res.status(200).json({ success: true, message: "OTP Resend Successfully" });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to resend OTP. Please try again",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal Server Error. Please try again",
    });
  }
};

//Load Login - Redirect Login
const loadLogin = async (req, res) => {
  try {
    let referrals = req.query.ref || "";
    const referrer = req.query.referrer;

    return res.render("user/signup", { referrals, referrer });
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const findUser = await User.findOne({ isAdmin: 0, email: email });

    const passwordMatch = await bcrypt.compare(password, findUser.password);

    if (!passwordMatch) {
      return res.render("user/signup", {
        message: "Entered Incorrect password",
      });
    }

    if (!findUser) {
      return res.render("user/signup", { message: "User not found" });
    }

    if (findUser.isBlocked) {
      return res.render("user/signup", {
        message: "User is blocked by the admin",
      });
    }

  

    req.session.user = findUser._id;

    res.redirect("/");
  } catch (error) {
    res.render("user/signup", {
      message: "Login failed. Please try again later",
    });
  }
};

const getFrogotPass = async (req, res) => {
  res.render("user/forgotPassword");
};

// Forgot Password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, "i") } });

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

    res.render("user/forgot-password-verify-otp", { email, otp });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred. Please try again later.",
    });
  }
};

// Verify Forgot Password
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

    if (otp === req.session.userOtp) {
      const user = req.session.userData;

      console.log(`OTP Sent3: ${otp}`);

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
    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred. Please try again later.",
    });
  }
};

const passwordReset = async (req, res) => {
  res.render("user/forgot-password-cpassword");
};

// Reset Password
const passwordChange = async (req, res) => {
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
    const updatedUser = await User.findByIdAndUpdate(user._id, { password: passwordHash }, { new: true });

    // Clear the OTP and user data from the session
    req.session.userOtp = null;
    delete req.session.userData;

    // Set the user session to the updated user ID
    req.session.user = updatedUser._id;

    res.redirect("/login");
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred. Please try again later.",
    });
  }
};

//Logout
const logout = async (req, res) => {
  try {
    if (req.user) {
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
        return res.redirect("/pageNotFound");
      }
      return res.redirect("/login");
    });
  } catch (error) {
    console.log("Logout error", error);
    res.redirect("/pageNotFound");
  }
};

// Get Profile
const getUserProfile = async (req, res) => {
  try {
    const userId = req.session.user;
    const wallet = await Wallet.findOne({ userId });

    if (!userId) {
      req.flash("error", "User not found in session");
      return res.redirect("/login");
    }

    if (!wallet) {
      const newWallet = new Wallet({
        userId: userId,
        balance: 10,
        transactions: [
          {
            message: "Sign in bonus",
            amount: 10,
            type: "Credit",
          },
        ],
      });
      await newWallet.save();
    }

    const user = await User.findOne({ _id: userId, isBlocked: false });

    if (!user) {
      req.flash("error", "User not found or is blocked");
      return res.redirect("/login");
    }

    res.render("user/profile", { user });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    req.flash("error", "Failed to load profile");
    return res.redirect("/login");
  }
};

// Edit Profile
const editProfile = async (req, res) => {
  try {
    const userId = req.session.user;

    if (!userId) {
      return res.status(400).json({ message: "User not found in session" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { fullName, phone } = req.body;

    if (!fullName || !phone) {
      return res.status(400).json({ message: "All fields are required" });
    }

    user.name = fullName.trim() || user.name;
    user.phone = phone.trim() || user.phone;

    await user.save();

    res.status(200).json({ message: "Profile updated successfully", user });
  } catch (error) {
    res.status(500).json({ message: "An error occurred while updating the profile" });
  }
};

// Reset Password
const resetPassword = async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;

  if (!oldPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (!newPassword || newPassword !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match." });
  }

  try {
    const user = await User.findById(req.session.user);

    const isMatch = bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Old password is incorrect." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: "Password successfully reset." });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
};

// Get Address
const getAddress = async (req, res) => {
  const address = await Address.find({
    customerId: req.session.user,
    delete: false,
  });

  res.render("user/address", {
    address,
    user: req.session.user,
    success: req.flash("success"),
    error: req.flash("error"),
  });
};

// Add Address
const addAddress = async (req, res) => {
  try {
    const newAddress = await Address.create(req.body);

    req.flash("success", "Address Added");
    res.status(200).json({ success: true, message: "Address added successfully" });
  } catch (error) {
    req.flash("error", "Failed to add address. Please try again.");
    res.redirect("/address");
  }
};

// Get Edit Address
const getEditAddress = async (req, res) => {
  const addressId = req.params.id;

  try {
    const address = await Address.findOne({ _id: addressId });
    if (address) {
      res.status(200).json({ status: true, address });
    } else {
      res.status(404).json({ status: false, message: "Address not found" });
    }
  } catch (error) {
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};

// Edit Address
const editAddress = async (req, res) => {
  try {
    const addressId = req.params.id;
    const updatedAddress = req.body;

    const address = await Address.findByIdAndUpdate(addressId, updatedAddress, {
      new: true,
    });

    if (!address) {
      return res.status(404).send({ message: "Address not found with id " + addressId });
    }

    req.flash("success", "Address Edited");
    res.status(200).json({ success: true, message: "Successfully edited address" });
  } catch (error) {
    req.flash("error", "Error editing address. Please try again.");
    res.redirect("/address");
  }
};

// Delete Address
const deleteAddress = async (req, res) => {
  let id = req.params.id;
  try {
    const result = await Address.findByIdAndUpdate(id, { delete: true }, { new: true });
    if (result) {
      res.status(200).json({ message: "Address deleted successfully" });
    } else {
      res.status(404).json({ message: "Address not found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get Referrals
const getReferrals = async (req, res) => {
  const user = await User.findOne({ _id: req.session.user }).populate("referralCode referrals");

  function generateRefferalCode(length) {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let referralCode = "";
    for (let i = 0; i < length; i++) {
      referralCode += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return referralCode;
  }

  if (!user.referralCode) {
    const refferalCode = generateRefferalCode(8);

    user.referralCode = refferalCode;
    await user.save();
  }

  const referrals = await Referral.find({ referrer: req.session.user }).populate("referredUserDetails.user");

  let totalCountOfUsers = 0;
  // Loop through each referral
  referrals.forEach((referral) => {
    // Loop through referredUserDetails array inside each referral
    referral.referredUserDetails.forEach((item) => {
      totalCountOfUsers++;
    });
  });

  const newUser = await User.find({ user: req.session.user });

  res.render("user/refferals", {
    refferalCode: user.referralCode,
    successfullRefferals: referrals,
    user,
    totalCountOfUsers,
  });
};

const getVerifyOtp = async (req, res) => {
  res.render("user/verify-otp");
};

module.exports = {
  pageNotFound,

  getVerifyOtp,

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
  resetPassword,

  getReferrals,

  logout,
};
