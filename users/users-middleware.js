const joi = require('joi')
const logger = require('../logger');


const ValidateUserCreation = async (req, res, next) => {
  try {
    logger.info('[ValidateUserCreation] => Validate user creation process started...');
    const schema = joi.object({
      first_name: joi.string().required(),
      last_name: joi.string().required(),
      email: joi.string().email().required(),
      password: joi.string().required(),
    })

    await schema.validateAsync(req.body, { abortEarly: true })

    logger.info('[ValidateUserCreation] => Validate user creation process done.');
    next()
  } catch (error) {
      return res.status(422).json({
        message: error.message,
        success: false
      })
  }
}

const LoginValidation = async (req, res, next) => {
  try {
    logger.info('[LoginValidation] => Login validation process started...');
    const schema = joi.object({
      email: joi.string().email().required(),
      password: joi.string().required(),
    })

    await schema.validateAsync(req.body, { abortEarly: true })
    
    logger.info('[LoginValidation] => Login validation process done.');
    next()
} catch (error) {
    return res.status(422).json({
      message: error.message,
      success: false
    })
  }
}


module.exports = {
  ValidateUserCreation,
  LoginValidation
}