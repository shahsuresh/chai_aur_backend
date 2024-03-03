//require("dotenv").config({ path: "./env" });
import dotenv from "dotenv";
import connectDB from "./db/connectDB.js";
import app from "./app.js";
//set path for .env to root

dotenv.config({ path: "./env" });

//?=====DATABASE CONNECTION=========

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server is running at ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log(`DB Connection Error`, err);
  });
//?==============
