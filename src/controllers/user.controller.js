import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import User from "../models/user.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

//?=====method to generate tokens ===========

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);

    const accessToken = user.generateAccessToken();

    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating tokens");
  }
};

//?==========register user=======

export const registerUser = asyncHandler(async (req, res) => {
  //res.status(200).json({ message: "Ok" });
  //?steps for registering new user

  // get user details from front end
  const { fullName, email, userName, password } = req.body;

  //console.log(email);
  //res.send("email");

  // validation -- not empty for required fields
  if (
    [fullName, email, userName, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // check if user already exists: username, email

  const existedUser = await User.findOne({ $or: [{ userName }, { email }] });
  if (existedUser) {
    throw new ApiError(409, "User with this email and username already exists");
  }

  // check for images, avatar
  //console.log("request FILES==\n", req.files);
  const avatarLocalPath = req.files?.avatar[0].path;
  //console.log(avatarLocalPath);
  // const coverImageLocalPath = req.files?.coverImage[0].path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }
  // upload them to cloudinary, avatar
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  //console.log(avatar);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  // if NO avatar file, through error

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }
  // create user object, create entry in db
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: userName.toLowerCase(),
  });
  // check for successful user creation
  //than
  // remove password and refresh token field from response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while creating user");
  }

  // return response
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered Successfully"));
});

//?=======login user=========

export const loginUser = asyncHandler(async (req, res) => {
  // extract login data from req.body
  const { email, userName, password } = req.body;

  // check username, email
  if (!(email || userName)) {
    throw new ApiResponse(400, "email or username required");
  }

  // find user
  const user = await User.findOne({
    $or: [{ email: email }, { username: userName }],
  });

  // if not user, throw error
  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  // check for password
  const isPasswordValid = await user.isPasswordCorrect(password);

  // if wrong password, throw error
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid User Credentials");
  }

  // generate accessToken and refreshToken
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // send cookies
  const options = { httpOnly: true, secure: true };

  // send response
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User Logged in Successfully"
      )
    );
});

//?====logout user ========
export const logoutUser = asyncHandler(async (req, res) => {
  // find user and remove accessToken
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: { refreshToken: 1 }, // removes the field from document
    },
    { new: true }
  );

  // delete cookies
  const options = { httpOnly: true, secure: true };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out"));
});

//?=========refresh Access Token=======

export const refreshAccessToken = asyncHandler(async (req, res) => {
  //extract refreshToken from cookies
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  // if refreshToken does not found, throw error
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized Request");
  }

  try {
    // verify token
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    // find user from db using "_id" , wrapped in decodedToken
    const user = await User.findById(decodedToken?._id);

    // if  user not found from this token, throw error
    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token");
    }

    // match tokens
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh Token is Expired or used");
    }

    // generate new tokens
    const options = { httpOnly: true, secure: true };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    // send response
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "AccessToken Refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Refresh Token");
  }
});

//?======== Change or Update Password=========

export const changeCurrentPassword = asyncHandler(async (req, res) => {
  // extract old password and new password from req.body
  const { oldPassword, newPassword } = req.body;

  // find user details in db using "_id " wrapped in req object
  const user = await User.findById(req.user?._id);

  // check if the old password is correct or not
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  // if old password is wrong
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }

  // update old Password with newPassword
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

//?===========get current user details(logged in user)=========

export const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"));
});

//?======== Update user account details===============
export const updateAccountDetails = asyncHandler(async (req, res) => {
  // extract new values form req.body
  const { fullName, email } = req.body;

  // check for empty fields
  if (!fullName || !email) {
    throw new ApiError(400, "All fields are required");
  }

  // update user in db with new details
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    { new: true }
  ).select("-password");

  console.log(user);
  // send response
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

//?=========update user avatar============

export const updateUserAvatar = asyncHandler(async (req, res) => {
  //extract file path
  const avatarLocalPath = req.file?.path;

  //if not file, throw error
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  // upload avatar image file on cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);

  // if error during uploading, throw error
  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading on avatar");
  }

  // find user by "_id" in db and update with new image url
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  // send response
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar image updated successfully"));
});

//?=========update user Cover Image============
export const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover image file is missing");
  }

  //TODO: delete old image - assignment

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading on avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated successfully"));
});

//?========get user channel profile============
export const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "username is missing");
  }

  // database aggregation pipeline to count subscribers and channels
  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(404, "channel does not exists");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully")
    );
});

//?========watch history=========
export const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "Watch history fetched successfully"
      )
    );
});
