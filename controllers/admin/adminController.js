const User = require("../../models/userSchema");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

//Page-error

const pageerror = async (req,res) =>{
    res.render("admin-error");
}


//Load login page

const loadLogin = (req, res) => {
  if (req.session.admin) {
    return res.redirect("/admin/dashboard");
  }

  res.render("admin/login", { message: null });
};

// login - Dashboard

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await User.findOne({ email, isAdmin: true });
    if (admin) {
      const passMatch = bcrypt.compare(password, admin.password);
      if (passMatch) {
        req.session.admin = true;
        return res.redirect("/admin");
      } else {
        return res.redirect("/login");
      }
    } else {
      return res.redirect("/login");
    }
  } catch (error) {
    console.log("Login error", error);
    return res.redirect("/pageerror");
  }
};


//Load-Dashboard

const loadDashboard = async (req,res) =>{
    if(req.session.admin){
        try {
            res.render("admin/dashboard");
        } catch (error) {
            res.redirect("/pageerror")
        }
    }
}


//Logout

const logout = async (req,res) =>{
  try {
      req.session.destroy(err => {
        if(err) {
          console.log("Error destroying session", err);
          return res.redirect("/pageerror");
        }
        res.redirect("/admin/login")
      }) 
  } catch (error) {
    console.log("unexpected");
    res.redirect("/pageerror");
  }
  
}

module.exports = {
  loadLogin,
  login,
  loadDashboard,
  pageerror,
  logout,
};
