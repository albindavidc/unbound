const User = require("../models/userSchema");

const userAuth = (req, res, next) => {
  if (req.session.user ) {
    User.findById(req.session.user)
      .then((data) => {
        if (data && !data.isBlocked) {
          next();
        } else {
          res.redirect("/login");
        }
      })
      .catch((error) => {
        console.log("Error in user auth middleware");
        res.status(500).send("Internal Server Error");
      });
  } else {
    res.redirect("/login");
  }
};

const adminAuth = (req, res, next) => {
  User.findOne({ isAdmin: true })
    .then((data) => {
      if (data) {
        next();
      } else {
        res.redirect("/admin/login"); // Ensure this redirection is intended
      }
    })
    .catch((error) => {
      console.log("Error in the admin_auth middleware", error);
      res.status(500).send("Internal Server Error");
    });
};


const checkUserStatus = async (req, res, next) => {
  try {
    if (req.isAuthenticated() || req.session.user) { 
      const userId = req.session.user; 

      // Find the user and check if they are blocked
      const user = await User.findOne({ _id: userId, isBlocked: true });

      if (user) { // If the user is found and is blocked
        req.logout((err) => { // Logs out the user
          if (err) {
            return next(err);
          }
          req.session.destroy((err) => { // Destroys the session
            if (err) {
              return next(err);
            }
            return res.redirect('/login');
          });
        });
      } else {
        return next(); // User is not blocked, proceed to the next middleware
      }
    } else {
      return next(); // User is not authenticated, proceed to the next middleware
    }
  } catch (error) {
    console.log("Error in the checkUserStatus middleware", error);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = checkUserStatus;



const isLogedOut = (req, res, next) => {
  if(req.isAuthenticated() || req.session.user){
    return res.redirect("/");
  }

  // if(req.session.user) {
  //   return res.redirect("/")
  // }
  next();
};

module.exports = {
  userAuth,
  adminAuth,
  checkUserStatus,
  isLogedOut,

};
