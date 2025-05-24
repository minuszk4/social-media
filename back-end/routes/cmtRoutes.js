const express = require('express');
const router = express.Router();
const commentController = require('../controllers/cmtController');

router.get('/post/:postId', commentController.getCMTbyPostId);

router.post('/', commentController.createCMT);


router.delete('/:commentId',  commentController.deleteComment);

router.get('/replies/:commentId', commentController.getRepliesByCommentId);

module.exports = router;