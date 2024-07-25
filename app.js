require('dotenv').config();
const express = require('express');
const db = require('./config/db');
const path = require('path');
const userRouter = require('./routes/userRouter');
const morgan = require("morgan");
const port = process.env.PORT|| 7000;

const app = express();
db();

app.use(express.json());
app.use(express.urlencoded({extended:true}));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname,'views'));
app.use(express.static(path.join(__dirname,'public')));

app.use(morgan("dev"));

app.use('/',userRouter);

app.listen(port, () => {
  console.log('The server is up and running')
})
