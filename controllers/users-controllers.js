const { validationResult } = require("express-validator");

const HttpError = require("../models/http-error");
const User = require("../models/user-model");

const getUser = async (req, res, next) => {
  const userId = req.params.id;
  let user;
  try {
    user = await User.find({ _id: userId }, "-password, -__v");
  } catch (error) {
    return next(
      new HttpError("Fetching user failed, please try again later", 404)
    );
  }
  res.json({
    message: "User fetched successfully",
    user,
  });
};

const signupUser = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid input(s) passed, please check your data.", 422)
    );
  }
  const { fullname, email, password, username } = req.body;

  let emailTaken, usernameTaken;

  try {
    emailTaken = await User.findOne({ email: email });
    usernameTaken = await User.findOne({ username: username });
  } catch {
    return next(
      new HttpError("Signing up failed, please try again later", 500)
    );
  }

  if (emailTaken) {
    const error = new HttpError(
      "email already taken, please use a different one or login instead",
      422
    );
    return next(error);
  }

  if (usernameTaken) {
    const error = new HttpError(
      "username already taken, please use a different one",
      422
    );
    return next(error);
  }
  const createdUser = new User({
    fullname,
    email,
    password,
    username,
  });
  try {
    await createdUser.save();
  } catch (error) {
    return next(
      new HttpError("Creating new user failed, please try again.", 500)
    );
  }

  res.status(201).json({
    message: "created user successfully",
    data: createdUser,
  });
};

const loginUser = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid input(s) passed, please check your data", 422)
    );
  }
  const { username, password } = req.body;

  let existingUser;

  try {
    existingUser = await User.findOne({ username: username });
  } catch (err) {
    return next(new HttpError("Logging in failed, please try again", 500));
  }

  if (!existingUser || existingUser.password !== password) {
    return next(
      new HttpError("Invalid credentails, could not log you in", 401)
    );
  }
  res.json({
    message: "logged in",
    data: existingUser,
  });
};

exports.getUser = getUser;
exports.signupUser = signupUser;
exports.loginUser = loginUser;
