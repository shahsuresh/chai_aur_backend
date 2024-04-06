import { Router } from "express";
import {
  changeCurrentPassword,
  getCurrentUser,
  getUserChannelProfile,
  getWatchHistory,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
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

//?========update account details=====================
router.route("/update-name-email").patch(verifyJWT, updateAccountDetails);

//?==========update avatar image================
router
  .route("/update-avatar")
  .patch(verifyJWT, upload.single("avatar"), updateUserAvatar);

//?=========update cover Image============
router
  .route("/update-coverimage")
  .patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);

//?========== channel Profile============
router.route("/c/:username").get(verifyJWT, getUserChannelProfile);

//?==========get watch history===========
router.route("/watch-history").get(verifyJWT, getWatchHistory);
export default router;
