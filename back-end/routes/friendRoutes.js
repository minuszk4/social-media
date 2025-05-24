const express = require("express");
const {
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    unfriend,
    getFriends,
    getFriendStatus,
    getFriendsRequest,
    cancelFriendRequest
} = require("../controllers/friendController");
// const friendController = require("../controllers/friendController");
// console.log("friendController:", friendController);

const router = express.Router();

router.post("/send", sendFriendRequest);
router.post("/accept", acceptFriendRequest);
router.post("/reject", rejectFriendRequest);
router.post("/unfriend", unfriend);
router.get("/list", getFriends);
router.get("/status", getFriendStatus);
router.get("/requests",getFriendsRequest);
router.post("/cancel",cancelFriendRequest)
module.exports = router;
