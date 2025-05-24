const express = require("express");
const router = express.Router();
const profileController = require("../controllers/profileController");
const multer = require("multer");
const path = require("path");
const upload = require('../cloud/upload')

router.get("/:profileId", profileController.getUserProfile);
router.put("/change-password",profileController.UpdatePassword);
router.put("/:profileId", upload.single("avatar"), profileController.updateUserProfile);
module.exports = router;
