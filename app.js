const express = require('express');
require('dotenv').config();
const db = require('./config/db');

const app = express();
db();

const PORT = process.env.PORT || 3000;


app.listen(PORT, () => {
  console.log('The server is up and running')
})

module.exports = app;