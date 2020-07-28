const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const reviewsRoutes = require("./routes/reviews-routes");
const usersRoutes = require("./routes/users-routes");
const HttpError = require("./models/http-error");

const app = express();

app.use(express.json());

app.use(cors());

app.use("/api/reviews", reviewsRoutes); // api/reviews/
app.use("/api/users", usersRoutes); // api/users

// handle unregistered routes
app.use((req, res, next) => {
  const error = new HttpError("Could not find this route", 404);
  throw error;
});

app.use((error, req, res, next) => {
  if (res.headerSent) {
    return next(error);
  }
  res.status(error.code || 500);
  res.json({ message: error.message || "An unknown error occured!" });
});

const port = process.env.PORT || 5000;

mongoose
  .connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0-gzpna.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      useFindAndModify: false,
    }
  )
  .then(() =>
    app.listen(port, () => console.log(`Server is up on port ${port}`))
  )
  .catch((err) => console.log(err));
