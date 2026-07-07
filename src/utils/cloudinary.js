const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Delete an image from Cloudinary by its public ID.
 * @param {string} publicId - The Cloudinary public ID of the image
 */
const deleteImageFromCloudinary = async (publicId) => {
  if (!publicId) return;
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log(`Cloudinary image deleted: ${publicId}`, result);
    return result;
  } catch (error) {
    console.error(`Error deleting Cloudinary image ${publicId}:`, error);
  }
};

const createUploadSignature = (paramsToSign = {}) => {
  return cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET,
  );
};

const getSignedDownloadUrl = (publicId, fileName = "resume.pdf") => {
  return cloudinary.url(publicId, {
    resource_type: "raw",
    type: "upload",
    sign_url: true,
    expires_at: Math.floor(Date.now() / 1000) + 15 * 60,
    flags: `attachment:${fileName}`,
  });
};

module.exports = {
  cloudinary,
  deleteImageFromCloudinary,
  createUploadSignature,
  getSignedDownloadUrl,
};
