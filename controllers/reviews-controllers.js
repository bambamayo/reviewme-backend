const mongoose = require("mongoose");
const { validationResult } = require("express-validator");

const HttpError = require("../models/http-error");
const Review = require("../models/review-model");
const User = require("../models/user-model");

// Get all reviews
const getAllReviews = async (req, res, next) => {
  let reviews;
  try {
    reviews = await Review.find({}, "-__v");
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find reviews",
      500
    );
    return next(error);
  }

  res.json({
    message: "Reviews fetched successfully",
    data: reviews,
  });
};

// Get a review with its id
const getReviewById = async (req, res, next) => {
  const reviewId = req.params.id;
  let review;
  try {
    review = await Review.findById(reviewId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, please try again later",
      500
    );
    return next(error);
  }

  if (!review) {
    return next(new HttpError("Could not find a review with provided id", 404));
  }
  res.json({
    message: "review found successfully",
    data: review,
  });
};

// Get reviews authored by a user, using their id
const getReviewsByUserId = async (req, res, next) => {
  const userId = req.params.userId;
  let userReviews;
  try {
    userReviews = await Review.find({ author: userId });
  } catch (err) {
    const error = new HttpError(
      "Fetching user reviews failed please try again",
      404
    );
    return next(error);
  }

  if (!userReviews || userReviews.length === 0) {
    return next(
      new HttpError("Could not find review(s) for user with specified id", 404)
    );
  }

  res.json({
    message: "user reviews found successfully",
    data: userReviews,
  });
};

// Get reviews count of a place or item
const getReviewsCount = async (req, res, next) => {
  const rName = req.params.name.toLowerCase();
  let count;
  let reviews;
  try {
    reviews = await Review.find({ reviewedName: rName });
    count = reviews.length;
  } catch (err) {
    const error = new HttpError(
      "Fetching review count failed please try again",
      404
    );
    return next(error);
  }

  if (!reviews || reviews.length === 0) {
    return next(new HttpError("No review found", 404));
  }

  res.json({
    message: "review count found successfully",
    data: { count },
  });
};

// Create a new review
const createNewReview = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid input(s) passsed, please check your data", 422)
    );
  }
  const {
    reviewedName,
    introText,
    category,
    website,
    telephone,
    address,
    reviewDetails,
    images,
    author,
  } = req.body;
  const createdReview = new Review({
    reviewedName,
    introText,
    category,
    website,
    telephone,
    address,
    reviewDetails,
    images,
    author,
  });

  let user;
  try {
    user = await User.findById(author);
  } catch (err) {
    return next(new HttpError("Creating review failed, please try again", 500));
  }

  if (!user) {
    return next(new HttpError("Could not find user with author id", 404));
  }
  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdReview.save({ session: sess });
    user.postedReviews.push(createdReview);
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      "Creating review failed, please try again",
      500
    );
    return next(error);
  }

  res.status(201).json({
    message: "created review successfuly",
    data: createdReview,
  });
};

// Update existing review
const updateReview = async (req, res, next) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = [
    "introText",
    "category",
    "likes",
    "website",
    "telephone",
    "address",
    "reviewDetails",
  ];
  const isValidOperation = updates.every((update) =>
    allowedUpdates.includes(update)
  );

  if (!isValidOperation) return next(new HttpError("Invalid update(s)", 400));

  try {
    const review = await Review.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!review) {
      return next(new HttpError("Invalid review ID", 404));
    }
    return res
      .status(200)
      .json({ message: "Review updated successfully", data: review });
  } catch (err) {
    return next(
      new HttpError("Could not update review, please try again later", 500)
    );
  }
};

// Delete existing review
const deleteReview = async (req, res, next) => {
  const reviewId = req.params.id;
  let review;
  try {
    review = await Review.findById(reviewId).populate("author");
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete review",
      500
    );
    return next(error);
  }

  if (!review) {
    return next(new HttpError("Could not find a review with provided id", 404));
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await review.remove({ session: sess });
    review.author.postedReviews.pull(review);
    await review.author.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    return next(
      new HttpError("Something went wrong, could not delete review", 500)
    );
  }

  res.json({
    message: "Review deleted successfully",
    data: review,
  });
};

exports.getAllReviews = getAllReviews;
exports.getReviewById = getReviewById;
exports.getReviewsByUserId = getReviewsByUserId;
exports.getReviewsCount = getReviewsCount;
exports.createNewReview = createNewReview;
exports.updateReview = updateReview;
exports.deleteReview = deleteReview;
