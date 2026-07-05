const bcrypt = require("bcryptjs");

const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const {
  createUploadSignature,
  deleteImageFromCloudinary,
} = require("../utils/cloudinary");

const PROFILE_UPLOAD_FOLDER = "resume-builder/admin-profiles";

const getSafeUserPayload = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  mobile: user.mobile,
  role: user.role,
  profilePic: user.profilePic,
  profilePicPublicId: user.profilePicPublicId || null,
  status: user.status,
});

const verifyCurrentPin = async (userId, currentPin) => {
  const userWithPin = await User.findById(userId).select("+pinHash");
  if (!userWithPin) {
    throw new ApiError("User not found.", 404);
  }
  const isPinValid = await bcrypt.compare(currentPin, userWithPin.pinHash);
  if (!isPinValid) {
    throw new ApiError("Current PIN is incorrect.", 401);
  }
  return userWithPin;
};

const getMe = async (req, res, next) => {
  try {
    res.status(200).json(new ApiResponse(200, "Profile fetched successfully", {
      user: getSafeUserPayload(req.user),
    }));
  } catch (error) {
    next(error);
  }
};

const getUploadSignature = async (_req, res, next) => {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createUploadSignature({
      folder: PROFILE_UPLOAD_FOLDER,
      timestamp,
    });

    res.status(200).json(new ApiResponse(200, "Upload signature generated", {
      timestamp,
      signature,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      folder: PROFILE_UPLOAD_FOLDER,
    }));
  } catch (error) {
    next(error);
  }
};

const updateAvatar = async (req, res, next) => {
  try {
    const { profilePic, profilePicPublicId } = req.body;
    if (!profilePicPublicId.startsWith(`${PROFILE_UPLOAD_FOLDER}/`)) {
      return next(new ApiError("Invalid profile image path.", 400));
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return next(new ApiError("User not found.", 404));
    }

    const oldPublicId = user.profilePicPublicId;
    user.profilePic = profilePic;
    user.profilePicPublicId = profilePicPublicId;
    await user.save();

    if (oldPublicId && oldPublicId !== profilePicPublicId) {
      await deleteImageFromCloudinary(oldPublicId);
    }

    res.status(200).json(new ApiResponse(200, "Profile picture updated successfully", {
      user: getSafeUserPayload(user),
    }));
  } catch (error) {
    next(error);
  }
};

const changeEmail = async (req, res, next) => {
  try {
    const { email, currentPin } = req.body;
    await verifyCurrentPin(req.user._id, currentPin);

    const existingUser = await User.findOne({
      _id: { $ne: req.user._id },
      email,
    });
    if (existingUser) {
      return next(new ApiError("Email is already in use.", 400));
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return next(new ApiError("User not found.", 404));
    }
    user.email = email;
    await user.save();

    res.status(200).json(new ApiResponse(200, "Email updated successfully", {
      user: getSafeUserPayload(user),
    }));
  } catch (error) {
    next(error);
  }
};

const changeMobile = async (req, res, next) => {
  try {
    const { mobile, currentPin } = req.body;
    await verifyCurrentPin(req.user._id, currentPin);

    const existingUser = await User.findOne({
      _id: { $ne: req.user._id },
      mobile,
    });
    if (existingUser) {
      return next(new ApiError("Mobile number is already in use.", 400));
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return next(new ApiError("User not found.", 404));
    }
    user.mobile = mobile;
    await user.save();

    res.status(200).json(new ApiResponse(200, "Mobile updated successfully", {
      user: getSafeUserPayload(user),
    }));
  } catch (error) {
    next(error);
  }
};

const changePin = async (req, res, next) => {
  try {
    const { currentPin, newPin } = req.body;
    const userWithPin = await verifyCurrentPin(req.user._id, currentPin);

    userWithPin.pinHash = await bcrypt.hash(newPin, 10);
    await userWithPin.save();

    res.status(200).json(new ApiResponse(200, "PIN updated successfully"));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMe,
  getUploadSignature,
  updateAvatar,
  changeEmail,
  changeMobile,
  changePin,
};
