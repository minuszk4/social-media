const express = require("express");
const router = express.Router();
const reactionController = require("../controllers/reactionController");

router.post("/", reactionController.postReactions); 
router.get("/reactions/:target_type/:target_id", reactionController.getReactions);

module.exports =router;