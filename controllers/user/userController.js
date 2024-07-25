const User = require("../../models/userSchema");
const bcrypt = require("bcryptjs");


const pageNotFound = async (req, res) => {
  try {
    return res.render("page-404");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const loadHomepage = async (req, res) => {
  try {
    return res.render("user/home");
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

const signup = async (req, res) => {
  try {
    const { name, email, phone, password,cPassword } = req.body;
    if (!name || !email || !phone || !password || !cPassword) {

      return res.status(400).send("Missing fields");
    }

    if(password !== cPassword ){
        return res.status(404).send("Password is not match");
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).send("Email already exists");
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = new User({
      name: name,
      email: email,
      phone: phone,
      password: hashedPassword,
      isBlocked: false,
      isVerified: false,
      isAdmin: false,
    });

    console.log(newUser);

    await newUser.save();
    req.flash
    res.redirect("/user/signup") 

  } catch (error) {
    console.error("Error saving user:", error);
    res.status(500).send(`Internal server error`);
  }
};


const loadShopping = async (req, res) => {
  try {
    return res.render("shop");
  } catch (error) {
    console.log("Shopping page not loading:", error);
    res.status(500).send("Server Error");
  }
};

module.exports = {
  loadHomepage,
  pageNotFound,
  loadSignup,
  signup,
  loadShopping,
};
