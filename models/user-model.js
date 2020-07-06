const mongoose = require("mongoose");

const uniqueValidator = require("mongoose-unique-validator");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  fullname: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  avatar: { type: String, default: "" },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, minLength: 6 },
  postedReviews: [
    {
      type: mongoose.Types.ObjectId,
      default: [],
      ref: "Review",
    },
  ],
  list: [
    {
      type: mongoose.Types.ObjectId,
      default: [],
      ref: "Review",
    },
  ],
  likedReviews: [
    {
      type: mongoose.Types.ObjectId,
      default: [],
      ref: "Review",
    },
  ],
});

userSchema.plugin(uniqueValidator);

module.exports = mongoose.model("User", userSchema);
