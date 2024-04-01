import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

//?=====create instance of express() named app===
const app = express();

//? ============configure cors===============

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

//?========make app understand and use json=========

app.use(express.json({ limit: "16kb" }));
//?========make app to use params and url=======

app.use(express.urlencoded({ extended: true }));

//? ====app to use static and store file and folders in public folder=====

app.use(express.static("public")); // "public" is a name of folder

//?=======app to read,access and use cookies=======

app.use(cookieParser());

//?===============import and register routes=============

// importing user routes

import userRouter from "./routes/user.routes.js";

// routes declaration

app.use("/app/v1/users", userRouter);

//example url
//http://localhost:8000/app/v1/users/register

//?========export app==========
export default app;
