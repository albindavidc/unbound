require("dotenv").config();
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const session = require("express-session");
const flash = require("connect-flash");
const MongoStore = require("connect-mongo");
const nocache = require("nocache");
const methodOverride = require("method-override");
const compression = require("compression");
// const bodyParser = require('body-parser');


const db = require("./config/db");
const passport = require("./config/passport");
const userRouter = require("./routes/userRouter");
const adminRouter = require("./routes/adminRouter");

const port = process.env.PORT || 8080;
const app = express();
db();

//session
const mongoose = require("mongoose");
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({ clientPromise: mongoose.connection.asPromise().then(c => c.getClient()) }),
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 72 * 60 * 60 * 1000,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(flash());
app.use(compression());

// Static file middlewares before nocache so they can be cached by browsers
app.use(express.static(path.join(__dirname, "public"), { maxAge: "7d" }));
app.use("/admin-assets", express.static("public/admin-assets", { maxAge: "7d" }));
app.use("/public", express.static("public", { maxAge: "7d" })); // Static files for uploaded images

app.use(nocache());


// app.use((req, res, next) => {
//   res.set("cache-control", "no-store");
//   next();
// });

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});


// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

//Middlewares
app.use(logger("dev"));
app.use(express.urlencoded({ limit: '10mb',  extended: true })); // For URL-encoded data
app.use(express.json({limit: '10mb'}));
app.use(methodOverride("_method"));
app.use(cookieParser());

app.use("/", userRouter);
app.use("/admin", adminRouter);

app.listen(port, () => {
  console.log("The server is up and running");
});
