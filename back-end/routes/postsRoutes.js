const express = require("express");
const {
  getFrPosts,
  getPosts,
  getMyPosts,
  createPost,
  deletePost,
  profilePost,
  getPostMedia,
  updatePost,
  getaPost
} = require("../controllers/postsController");

const router = express.Router();

router.get("/", getPosts);

router.get("/friends", getFrPosts);

router.get("/my-posts", getMyPosts);
router.get("/profile:user_id", profilePost);
router.get("/:post_id",getaPost);
router.post("/", createPost);

router.delete("/:post_id", deletePost);

router.put("/:post_id", updatePost); 

router.get("/:post_id/media", getPostMedia);

// router.get("/profile/:user_id", profilePost);

module.exports = router;