const mongoose = require("mongoose");

const uniqueValidator = require("mongoose-unique-validator");

const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
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
    likedReviews: [
      {
        type: mongoose.Types.ObjectId,
        default: [],
        ref: "Review",
      },
    ],
  },
  {
    timestamps: true,
  }
);

userSchema.plugin(uniqueValidator);

userSchema.set("toJSON", {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
    delete returnedObject.password;
    delete returnedObject.updatedAt;
  },
});

module.exports = mongoose.model("User", userSchema);
