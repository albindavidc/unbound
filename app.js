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

const db = require("./config/db");
const passport = require("./config/passport");
const userRouter = require("./routes/userRouter");
const adminRouter = require("./routes/adminRouter");


const port = process.env.PORT || 8080;
const app = express();
db();



app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
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
app.use(nocache());

app.use((req, res, next) => {
  res.set("cache-control", "no-store");
  next();
});

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use("/admin-assets", express.static("public/admin-assets"))
app.use('/public', express.static('public')); // Static files for uploaded images


//Middlewares
app.use(logger("dev"));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", userRouter);
app.use("/admin", adminRouter);




app.listen(port, () => {
  console.log("The server is up and running");
});
