const express = require("express");
const { check } = require("express-validator");

const usersControllers = require("../controllers/users-controllers");
const auth = require("../middleware/check-auth");
const router = express.Router();

//Get, get loged in user private route
router.get("/", auth, usersControllers.getUserById);

//POST, create new user and log in user, public route
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

//POST, log in user, public route
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

// PATCH, edit user, private route
router.patch("/:id", auth, usersControllers.updateUser);

// DELETE, delete user, private route
router.delete("/:id", auth, usersControllers.deleteUser);

module.exports = router;
