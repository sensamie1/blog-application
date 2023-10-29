const express = require('express');
const middleware = require('./users-middleware')
const controller = require('./users-controller')
const globalMiddleware = require('.././middlewares/global-middlewares')

const router = express.Router();


// Create user
router.post('/signup', globalMiddleware.checkBody, middleware.ValidateUserCreation, controller.CreateUser)

// Signin user
router.post('/login', middleware.LoginValidation, controller.Login)


module.exports = router
