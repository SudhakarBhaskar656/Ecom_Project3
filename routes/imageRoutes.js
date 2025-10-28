const express = require("express");
const router = express.Router();
const { removeImage } = require("../controllers/image.controller");

router.delete("/deleteimage", removeImage); // send { "publicId": "folder/image" } in body

module.exports = router;
