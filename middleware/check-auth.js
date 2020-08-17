const jwt = require("jsonwebtoken");

const HttpError = require("../models/http-error");

module.exports = (req, res, next) => {
  if (req.method === "OPTIONS") {
    return next();
  }

  //Get token from header
  const token = req.header("x-auth-token");

  //Check if token is not present
  if (!token) {
    return next(new HttpError("No token, authorization denied"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.userId;
    next();
  } catch (error) {
    return next(new HttpError("Token is not valid", 401));
  }
};
