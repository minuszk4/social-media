const express = require("express");
const storiesController = require("../controllers/storyController");

const router = express.Router();

router.post("/", storiesController.upload, storiesController.postStory);

router.get("/getview/:storyId", storiesController.getStoryView);      
router.post("/:storyId/view", storiesController.viewStory);        

router.get("/:user_id/:story_id", storiesController.getStory);     

router.get("/:user_id", storiesController.getStories);             

router.delete("/:story_id", storiesController.deleteStory);


module.exports = router;
