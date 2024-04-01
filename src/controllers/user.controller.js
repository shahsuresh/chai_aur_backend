import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import User from "../models/user.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

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
      $set: { refreshToken: undefined },
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
