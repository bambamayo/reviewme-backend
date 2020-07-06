const express = require("express");
const { check } = require("express-validator");

const usersControllers = require("../controllers/users-controllers");

const router = express.Router();

//GET all users, private route
router.get("/", usersControllers.getAllUsers);

//POST, create new user and log in user, private route
router.post(
  "/signup",
  [
    check("fullname").not().isEmpty().withMessage("Please enter your fullname"),
    check("username").not().isEmpty().withMessage("Please enter your username"),
    check("email")
      .normalizeEmail()
      .isEmail()
      .withMessage("Please enter a valid email"),
    check("password")
      .isLength({ min: 6 })
      .withMessage("Password must have a minimum length of 6"),
  ],
  usersControllers.signupUser
);

//POST, log in user, private route
router.post(
  "/login",
  [
    check("username").not().isEmpty().withMessage("Please enter your username"),
    check("password")
      .isLength({ min: 6 })
      .withMessage("Password must have a minimum length of 6"),
  ],
  usersControllers.loginUser
);

module.exports = router;

//name, username, email , password
