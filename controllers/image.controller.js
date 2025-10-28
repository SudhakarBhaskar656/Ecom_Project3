const { deleteImage } = require("../utils/multer");

exports.removeImage = async (req, res) => {
  try {
    const { publicId } = req.body; // or req.params
    if (!publicId) {
      return res.status(400).json({ success: false, message: "publicId is required" });
    }

    const result = await deleteImage(publicId);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
