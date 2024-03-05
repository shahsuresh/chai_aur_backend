import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import User from "../models/user.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  //res.status(200).json({ message: "Ok" });
  //?steps for registering new user

  // get user details from front end
  const { fullName, email, userName, password } = req.body;

  console.log(email);
  res.send("email");

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
  const avatarLocalPath = req.files?.avatar[0].path;
  const coverImageLocalPath = req.files?.coverImage[0].path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }
  // upload them to cloudinary, avatar
  const avatar = await uploadOnCloudinary(avatarLocalPath);
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

export default registerUser;
