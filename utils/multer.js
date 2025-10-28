
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary with your credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Set up Cloudinary storage for Multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'uploads/images', // The folder in Cloudinary where the images will be stored
    allowed_formats: ['jpg', 'jpeg', 'png','avif','webp'], // Allowed file types
    public_id: (req, file) => Date.now() + '-' + file.originalname, // File name on Cloudinary
  },
});

// Initialize Multer with Cloudinary storage
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
});



// Delete single image
const deleteImage = async (publicId) => {
  return await cloudinary.uploader.destroy(publicId);
};

// Delete multiple images
const deleteImages = async (publicIds) => {
  return await cloudinary.api.delete_resources(publicIds);
};

// Delete all images in a folder
const deleteFolder = async (folderName) => {
  await cloudinary.api.delete_resources_by_prefix(folderName);
  return await cloudinary.api.delete_folder(folderName);
};

module.exports = {upload,deleteImage,deleteImages,deleteFolder}


