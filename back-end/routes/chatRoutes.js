const chatController = require("../controllers/chatController")
const express = require("express");
const upload = require("../cloud/upload"); // nơi cấu hình multer + cloudinary
const router = express.Router();
router.post("/create",chatController.createChat);
router.post("/send",upload.single("media"), chatController.sendMessage);
router.get("/unread",chatController.getUnreadMessages);
router.get("/:conversation_id",chatController.conversation);
module.exports = router;