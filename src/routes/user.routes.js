import { Router } from "express";
import {
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
router.route("/refreshtoken").post(refreshAccessToken);

export default router;
