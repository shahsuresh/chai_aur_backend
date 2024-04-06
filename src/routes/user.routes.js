import { Router } from "express";
import {
  changeCurrentPassword,
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

//?==router on /user =======

//?=====route for register user
router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

//?=====route for login user ===========
router.route("/login").post(loginUser);

//?====logout=========
//secured route

router.route("/logout").post(verifyJWT, logoutUser);

//?=====route for refresh access token======
router.route("/refreshtoken").post(refreshAccessToken);

//?=====route for change or update password=======
router.route("/change-password").put(verifyJWT, changeCurrentPassword);

//?=======get user details / user profile ========
router.route("/profile").get(verifyJWT, getCurrentUser);

export default router;
