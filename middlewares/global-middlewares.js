const UserModel = require('../models/user-model');
const jwt = require('jsonwebtoken');
const logger = require('../logger');



const checkBody = (req, res, next) => {
  try {
    logger.info('[CheckBody] => Body check process started...');
    const contentType = req.headers['content-type'];
    if (!req.body || !contentType || contentType.indexOf('application/json') !== 0) {
      return res.status(400).json({
        data: null,
        error: 'must have a body with content type of application/json'
      })
    }
    logger.info('[CheckBody] => Body check process done.');
  } catch (error) {
    console.log(error)
      return res.status(400).json({
        message: "Invalid request syntax"
      })
  }
  next()
}

const bearerTokenAuth = async (req, res, next) => {
  try {
    logger.info('[Authentication] => Authentication process started...');
  const authHeader = req.headers;

  if (!authHeader.authorization) {
    return res.status(401).json({ message: 'You are not authenticated!' });
  }

  const token = authHeader.authorization.split(' ')[1]; // berear tokenvalue

  const decoded = await jwt.verify(token, process.env.JWT_SECRET)

  const user = await UserModel.findOne({ _id: decoded._id })
  
  if (!user) {
    return res.status(401).json({
      message: "Unauthorized",
    })
  }

  req.user = user;

  logger.info('[Authentication] => Authentication process done.');
  next()
  } catch (error) {
      console.log(error)
      return res.status(401).json({
        message: "Unauthorized",
      })
  }
}

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};


module.exports = {
  checkBody,
  bearerTokenAuth,
  authenticateToken
}
