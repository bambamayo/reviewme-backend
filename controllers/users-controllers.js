const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const HttpError = require("../models/http-error");
const User = require("../models/user-model");

//get current logged in user
const getUserById = async (req, res, next) => {
  const userId = req.user;
  let user;
  try {
    user = await User.findById(userId);
  } catch (err) {
    return next(
      new HttpError(
        "Something went wrong, could not get user at this time",
        500
      )
    );
  }

  if (!user) {
    return next(new HttpError("Could not find a user with provided id", 404));
  }

  res.json({
    user,
  });
};

//create user code ---- public route
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

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (error) {
    return next(new HttpError("Could not create user please try again", 500));
  }

  const createdUser = new User({
    fullname,
    email,
    password: hashedPassword,
    username,
  });
  try {
    await createdUser.save();
  } catch (error) {
    return next(
      new HttpError("Creating new user failed, please try again.", 500)
    );
  }

  let token;
  try {
    token = jwt.sign(
      {
        userId: createdUser.id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
  } catch (error) {
    return next(
      new HttpError("Signing up failed, please try again later", 500)
    );
  }

  res.status(201).json({
    user: createdUser,
    token: token,
  });
};

//login user code --- public route
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

  if (!existingUser) {
    return next(new HttpError("Invalid username, could not log you in", 401));
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (error) {
    console.log("bcrypt");
    return next(new HttpError("Could not log you in, please try again", 500));
  }

  if (!isValidPassword) {
    return next(new HttpError("Invalid password, could not log you in", 401));
  }

  let token;
  try {
    token = jwt.sign(
      {
        userId: existingUser.id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
  } catch (error) {
    console.log("jwt");
    return next(new HttpError("Log in failed, please try again later", 500));
  }

  res.json({
    user: existingUser,
    token: token,
  });
};

exports.getUserById = getUserById;
exports.signupUser = signupUser;
exports.loginUser = loginUser;
