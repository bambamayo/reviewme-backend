const mongoose = require("mongoose");
const { validationResult } = require("express-validator");
const io = require("../socket");

const HttpError = require("../models/http-error");
const Review = require("../models/review-model");
const User = require("../models/user-model");
const { uploader } = require("../config/cloudinaryConfig");
const { dataUriMultiple } = require("../config/multer");

// Get all reviews
const getAllReviews = async (req, res, next) => {
  let reviews;
  try {
    reviews = await Review.find({}, null, { sort: { createdAt: -1 } }).populate(
      "author"
    );
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not fetch reviews",
      500
    );
    return next(error);
  }

  res.json({
    reviews,
  });
};

// Get a review with its id
const getReviewById = async (req, res, next) => {
  const reviewId = req.params.id;
  let review;
  try {
    review = await Review.findById(reviewId).populate("author");
  } catch (err) {
    return next(
      new HttpError("Something went wrong, please try again later", 500)
    );
  }

  if (!review) {
    return next(new HttpError("Could not find a review with provided id", 404));
  }
  res.json({
    review,
  });
};

// Get reviews authored by a user, using their id
const getReviewsByUserId = async (req, res, next) => {
  const userId = req.params.userId;
  let userReviews;
  try {
    userReviews = await Review.find({ author: userId }, null, {
      sort: { createdAt: -1 },
    }).populate({
      path: "author",
    });
  } catch (err) {
    const error = new HttpError(
      "Fetching user reviews failed please try again",
      404
    );
    return next(error);
  }

  res.json({
    userReviews,
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
    count,
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
  } = req.body;
  const createdReview = new Review({
    reviewedName: reviewedName.trim().toLowerCase(),
    introText: introText.trim(),
    category,
    website: website.trim(),
    telephone: telephone.trim(),
    address: address.trim(),
    reviewDetails: reviewDetails.trim(),
    author: req.user,
  });

  let user;
  try {
    user = await User.findById(req.user);
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
    createdReview.populate("author").execPopulate();
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

  io.getIO().emit("reviews", { action: "create", review: createdReview });

  res.status(201).json({
    createdReview,
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

  let verifyUser;
  try {
    verifyUser = await Review.findById(req.params.id);
  } catch (error) {
    return next(new HttpError("Could not update review, please try again"));
  }

  if (verifyUser.author.toString() !== req.user) {
    return next(
      new HttpError("You are not allowed to perform this operation", 401)
    );
  }

  try {
    const review = await Review.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    }).populate("author");

    if (!review) {
      return next(new HttpError("Invalid review ID", 404));
    }
    io.getIO().emit("reviews", { action: "update", review: review });
    return res.status(200).json({ review });
  } catch (err) {
    return next(
      new HttpError("Could not update review, please try again later", 500)
    );
  }
};

const addReviewImages = async (req, res, next) => {
  //Create a variable to check if user has authorization to perform action
  let verifyUser;
  try {
    verifyUser = await Review.findById(req.params.id);
  } catch (error) {
    return next(new HttpError("Could not update review, please try again"));
  }

  if (verifyUser.author.toString() !== req.user) {
    return next(
      new HttpError("You are not allowed to perform this operation", 401)
    );
  }

  if (req.files) {
    let multipleUploads = new Promise(async (resolve, reject) => {
      let upload_len = req.files.length;
      let upload_res = new Array();

      for (let i = 0; i <= upload_len; i++) {
        if (upload_res.length === upload_len) {
          resolve(upload_res);
        } else {
          const sentImg = dataUriMultiple(req.files, i);

          await uploader.upload(
            sentImg,
            {
              folder: "review_images/",
            },
            (error, result) => {
              if (result) {
                upload_res.push(result.public_id);
              } else if (error) {
                reject(error);
              }
            }
          );
        }
      }
    })
      .then((result) => result)
      .catch((error) => error);

    let upload = await multipleUploads;
    let review;
    try {
      review = await Review.findByIdAndUpdate(
        req.params.id,
        {
          $push: {
            images: {
              $each: [...upload],
            },
          },
        },
        { new: true }
      ).populate("author");
      //Return error if no review with specified id
      if (!review) {
        return next(new HttpError("Invalid review id", 404));
      }
      io.getIO().emit("reviews", { action: "update", review: review });
      // Return success message with review details
      return res.status(200).json({
        message: "Your have successfully uploaded images",
        review,
      });
    } catch (error) {
      return next(
        new HttpError("Could not update review, please try again", 500)
      );
    }
  } else {
    return next(new HttpError("No image(s) to upload", 404));
  }
};

//----Delete review image
const deleteReviewImages = async (req, res, next) => {
  let verifyUser;

  try {
    verifyUser = await Review.findById(req.params.id);
  } catch (error) {
    return next(new HttpError("Could not delete review, please try again"));
  }

  if (verifyUser.author.toString() !== req.user) {
    return next(
      new HttpError("You are not allowed to perform this operation", 401)
    );
  }

  let review;
  try {
    review = await Review.findById(req.params.id).populate("author");
  } catch (error) {
    return next(new HttpError("Something went wrong could not delete image"));
  }

  uploader.destroy(req.body.publicId, async function (error, result) {
    if (error) {
      return next(
        new HttpError("Could not perform operation, please try again")
      );
    }
  });

  review.images.pull(req.body.publicId);
  await review.save();

  io.getIO().emit("reviews", { action: "update", review: review });

  return res.status(200).json({
    message: "image deleted successfully",
    review,
  });
};

//----Delete existing review
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

  let verifyUser;
  try {
    verifyUser = await Review.findById(req.params.id);
  } catch (error) {
    return next(new HttpError("Could not delete review, please try again"));
  }

  if (verifyUser.author.toString() !== req.user) {
    return next(
      new HttpError("You are not allowed to perform this operation", 401)
    );
  }

  let imagesToDelete = review.images;

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

  for (let i = 0; i < imagesToDelete.length; i++) {
    uploader.destroy(imagesToDelete[i], function (error, result) {
      if (error) {
        console.log(error);
      }
    });
  }

  io.getIO().emit("reviews", { action: "delete", review: reviewId });

  res.status(204).end();
};

exports.getAllReviews = getAllReviews;
exports.getReviewById = getReviewById;
exports.getReviewsByUserId = getReviewsByUserId;
exports.getReviewsCount = getReviewsCount;
exports.createNewReview = createNewReview;
exports.updateReview = updateReview;
exports.deleteReview = deleteReview;
exports.addReviewImages = addReviewImages;
exports.deleteReviewImages = deleteReviewImages;
