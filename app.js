require('dotenv').config();
const express = require('express');
const db = require('./config/db');
const path = require('path');
const session = require("express-session");
const userRouter = require('./routes/userRouter');
const morgan = require("morgan");
const port = process.env.PORT|| 8080;

const app = express();
db();

app.use(express.json());
app.use(express.urlencoded({extended:true}));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave:false,
  saveUninitialized:true,
  cookie:{
    secure: false,
    httpOnly: true,
    maxAge: 72*60*60*1000
  }
}));

app.use((req,res,next) => {
  res.set('cache-control', 'no-store')
  next();
});

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname,'views'));
app.use(express.static(path.join(__dirname,'public')));

app.use(morgan("dev"));

app.use('/',userRouter);

app.listen(port, () => {
  console.log('The server is up and running')
})
