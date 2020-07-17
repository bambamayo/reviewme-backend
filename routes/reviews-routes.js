const express = require("express");
const { check } = require("express-validator");

const reviewsControllers = require("../controllers/reviews-controllers");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

//GET all reviews, public route
router.get("/", reviewsControllers.getAllReviews);

//GET a review with ID, public route
router.get("/:id", reviewsControllers.getReviewById);

//GET reviews related to a particular user, public route *change to username maybe
router.get("/:userId/reviews", reviewsControllers.getReviewsByUserId);

//GET amount of reviews a particular place or item e.t.c has, public route
router.get("/:name/count", reviewsControllers.getReviewsCount);

router.use(checkAuth);
//POST, add a new review , private route
router.post(
  "/",
  [
    check("reviewedName")
      .isString()
      .not()
      .isEmpty()
      .withMessage("Please enter the name of what you're reviewing"),
    check("introText")
      .isString()
      .not()
      .isEmpty()
      .withMessage("Please enter an intro text"),
    check("category")
      .isString()
      .not()
      .isEmpty()
      .withMessage("Please enter a category"),

    check("reviewDetails")
      .isString()
      .not()
      .isEmpty()
      .withMessage("Please enter your review"),
  ],
  reviewsControllers.createNewReview
);

//PATCH, update existing review, private route
router.patch("/:id", reviewsControllers.updateReview);

//PATCH, update existing review, private route
router.delete("/:id", reviewsControllers.deleteReview);

module.exports = router;
