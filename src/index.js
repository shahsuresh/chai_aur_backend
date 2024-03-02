//require("dotenv").config({ path: "./env" });
import dotenv from "dotenv";
import connectDB from "./db/connectDB.js";
//set path for .env to root

dotenv.config({ path: "./env" });

//?=====DATABASE CONNECTION=========

connectDB();
//?==============
