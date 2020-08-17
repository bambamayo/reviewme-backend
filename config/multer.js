const multer = require("multer");
const path = require("path");

const DataURIParser = require("datauri/parser");

const storage = multer.memoryStorage();
const multerUploads = multer({ storage }).single("image");

const parser = new DataURIParser();

const dataUri = (req) =>
  parser.format(path.extname(req.file.originalname).toString(), req.file.buffer)
    .content;

module.exports = { multerUploads, dataUri };

// const parser = new DatauriParser();
// // for getting the string from the file buffer
// const file = parser.format(
// path.extname(req.file.originalname).toString(),
// req.file.buffer
// ).content;
