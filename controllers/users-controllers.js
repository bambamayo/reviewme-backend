const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const HttpError = require("../models/http-error");
const User = require("../models/user-model");
const Review = require("../models/review-model");
const { dataUri } = require("../config/multer");
const { uploader } = require("../config/cloudinaryConfig");

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
    return next(new HttpError("Log in failed, please try again later", 500));
  }

  res.json({
    user: existingUser,
    token: token,
  });
};

//edit user details - private route
const updateUser = async (req, res, next) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ["username", "fullname", "email"];
  const isValidOperation = updates.every((update) =>
    allowedUpdates.includes(update)
  );

  if (!isValidOperation) return next(new HttpError("Invalid update(s)", 400));

  let verifyUser;
  try {
    verifyUser = await User.findById(req.params.id);
  } catch (error) {
    return next(new HttpError("Could not update user, please try again", 500));
  }

  if (verifyUser.id.toString() !== req.user) {
    return next(
      new HttpError("You are not allowed to perform this operation", 401)
    );
  }

  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!user) {
      return next(new HttpError("Invalid user id", 404));
    }
    return res.status(200).json({ user });
  } catch (err) {
    return next(
      new HttpError("Could not update user, please try again later", 500)
    );
  }
};

const updateProfilePicture = async (req, res, next) => {
  //Create a variable to check if user has authorization to perform action
  let verifyUser;
  try {
    //Get user with the user id
    verifyUser = await User.findById(req.params.id);
  } catch (error) {
    return next(new HttpError("Could not update user, please try again", 500));
  }

  //The auth middleware returns a user id
  //Check if the user id auth returns equals verfiyUser id
  if (verifyUser.id.toString() !== req.user) {
    return next(
      new HttpError("You are not allowed to perform this operation", 401)
    );
  }
  //Check if there is a req.file object
  if (req.file) {
    //Change buffer multer middleware returns us to a file cloudinary can parse
    const file = dataUri(req);
    return uploader
      .upload(file, {
        folder: "users_profile_picture/user1/",
        public_id: "user1_profile_picture",
      })
      .then(async (result) => {
        //Find user by user id and edit avatarPublicId field
        try {
          const user = await User.findByIdAndUpdate(
            req.params.id,
            { avatarPublicId: result.public_id },
            {
              new: true,
            }
          );
          //Return error if no user with specified id
          if (!user) {
            return next(new HttpError("Invalid user id", 404));
          }
          // Return success message with user details
          return res.status(200).json({
            messge: "Your profile picture has been uploaded successfully",
            user,
          });
        } catch (error) {
          return next(
            new HttpError("Could not update user, please try again later", 500)
          );
        }
      })
      .catch((err) => {
        //This is called if there is any error when updating avatarPublicId field
        return next(
          new HttpError(
            "Something went wrong could not perform operation, please try again",
            400
          )
        );
      });
  }
};

//Delete user profile
const deleteUser = async (req, res, next) => {
  const userId = req.params.id;
  let user;
  try {
    user = await User.findById(userId).populate("postedReviews");
  } catch (err) {
    return next(
      new HttpError("Something went wrong, could not delete review", 500)
    );
  }
  if (!user) {
    return next(new HttpError("Could not a find a user with provided id", 404));
  }

  let verifyUser;
  try {
    verifyUser = await User.findById(req.params.id);
  } catch (err) {
    return next(new HttpError("Could not delete user, please try again"));
  }

  if (verifyUser.id !== req.user) {
    return next(
      new HttpError("You are not allowed to perform this operation", 401)
    );
  }

  let userIdObj = mongoose.Types.ObjectId(req.user);

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await user.remove({ session: sess });
    await Review.deleteMany({ author: userIdObj });
    await sess.commitTransaction();
  } catch (err) {
    return next(
      new HttpError(
        "Something went wrong during transaction, could not delete user",
        500
      )
    );
  }

  res.status(204).end();
};

exports.getUserById = getUserById;
exports.signupUser = signupUser;
exports.loginUser = loginUser;
exports.updateUser = updateUser;
exports.updateProfilePicture = updateProfilePicture;
exports.deleteUser = deleteUser;
