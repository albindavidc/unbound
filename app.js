const express = require('express');
require('dotenv').config();
const db = require('./config/db');
const path = require('path');
const userRouter = require('./routes/userRouter');

const app = express();
db();

app.use(express.json());
app.use(express.urlencoded({extended:true}));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname,'views'));
app.use(express.static(path.join(__dirname,'public')));


app.use('/',userRouter);

app.listen(process.env.PORT || 3000, () => {
  console.log('The server is up and running')
})

module.exports = app;