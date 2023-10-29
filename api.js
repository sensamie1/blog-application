const express = require('express');
const blogRouter = require('./blogs/blogs-router');
const userRouter = require('./users/users-router');
const viewRouter = require('./views/views-router');
const UserModel = require('./models/user-model');
const session = require("express-session");
const flash = require("express-flash");
const bodyParser = require("body-parser");

require('dotenv').config();

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));

app.use(bodyParser.json())

app.use(session({
  secret:"secret key",
  resave:false,
  saveUninitialized:true,
  cookie:{maxAge:600000}
}));

app.use(flash());


// app.use(express.json()) // body parser

// app.use(express.urlencoded({ extended: true })); // body parser: formdata

app.set('view engine', 'ejs')

app.use('/blogs', blogRouter)

app.use('/users', userRouter)

app.use('/views', viewRouter)

// home route
app.get('/', (req, res) => {
  return res.status(200).json({ message: 'success', status: true })
})

app.get('/users', async (req, res) => {
  const users = await UserModel.find({})
  return res.json({
    users
  })
})


app.get('*', (req, res) => {
  return res.status(404).json({
    data: null,
    error: 'Route not found'
  })
})

// global error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({
    data: null,
    error: 'Server Error'
  })
})

module.exports = app;