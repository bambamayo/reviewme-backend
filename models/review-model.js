const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const reviewSchema = new Schema({
  reviewedName: { type: String, required: true },
  introText: { type: String, required: true },
  category: { type: String, required: true },
  datePosted: { type: Date, default: Date.now },
  likes: { type: Number, default: 0 },
  website: { type: String, default: null },
  telephone: { type: String, default: null },
  address: { type: String, default: null },
  reviewDetails: { type: String, required: true },
  images: { type: Array },
  author: { type: mongoose.Types.ObjectId, required: true, ref: "User" },
});

reviewSchema.set("toJSON", {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  },
});

module.exports = mongoose.model("Review", reviewSchema);
