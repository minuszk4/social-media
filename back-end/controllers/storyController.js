const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const db = require("../models/db");
const {cloudinary,storage} = require("../cloud/cloudinary")
const upload = require('../cloud/upload')

exports.upload = upload.single("media");

exports.postStory = async (req, res) => {
  const { user_id } = req.user;
  const mediaFile = req.file; 

  if (!user_id || !mediaFile) {
    return res.status(400).json({ message: "Thiếu thông tin cần thiết!" });
  }


  try {
    const media_url = mediaFile.path;
    const story_id = uuidv4();
    const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000); 

    await db.execute(
      "INSERT INTO Stories (story_id, user_id, created_at, expires_at) VALUES (?, ?, NOW(), ?)",
      [story_id, user_id, expires_at]
    );

    await db.execute(
      "INSERT INTO StoryMedia (media_id, story_id, media_type, media_url) VALUES (?, ?, ?, ?)",
      [uuidv4(), story_id, mediaFile.mimetype.includes('image') ? "image" : "video", media_url]
    );

    res.status(201).json({ message: "Story đã được thêm!", story_id });
  } catch (error) {
    console.error("Lỗi khi thêm story:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
};
exports.getStories = async (req, res) => {
  const { user_id } = req.user;
  const { limit = 10, page = 1 } = req.query;
  try {
    const offset = (page - 1) * limit;
    const sql = `
      SELECT s.story_id, s.user_id, sm.media_url, s.created_at, up.full_name, up.avatar_url
      FROM Stories s
      JOIN StoryMedia sm ON s.story_id = sm.story_id
      JOIN UserProfiles up ON up.user_id = s.user_id
      WHERE (s.user_id IN (
            SELECT user_id2 FROM Friendships WHERE user_id1 = ?
            UNION
            SELECT user_id1 FROM Friendships WHERE user_id2 = ?
          ) OR s.user_id = ?)
      AND s.expires_at > NOW()
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const [stories] = await db.query(sql, [user_id, user_id, user_id,  parseInt(limit), parseInt(offset)]);
    res.json(stories);
  } catch (error) {
    console.error("Error fetching stories:", error);
    res.status(500).json({ message: "Server error!" });
  }
};

exports.deleteStory = async (req, res) => {
  const { story_id } = req.params;

  try {
    const [storyMedia] = await db.execute(
      "SELECT media_url FROM StoryMedia WHERE story_id = ?",
      [story_id]
    );

    if (storyMedia.length > 0) {
      const publicId = storyMedia[0].media_url.split('/').pop().split('.')[0];

      await cloudinary.uploader.destroy(publicId);

      await db.execute("DELETE FROM StoryMedia WHERE story_id = ?", [story_id]);
    }
    await db.execute("DELETE FROM Stories WHERE story_id = ?", [story_id]);
    res.json({ message: "Story đã bị xóa!" });
  } catch (error) {
    console.error("Lỗi khi xóa story:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
};
exports.getStory = async (req, res) => {
  const {user_id,story_id} = req.query;
  try {
    let sql;
    if(req.user.isAdmin){
      sql = `
        SELECT s.story_id,s.user_id, sm.media_url, s.created_at, up.full_name, up.avatar_url
        FROM Stories s
        JOIN StoryMedia sm ON s.story_id = sm.story_id
        JOIN UserProfiles up ON up.user_id = s.user_id
        WHERE (s.user_id =? AND s.story_id = ?)
        ORDER BY s.created_at DESC
      `;
    }
    else{
      sql = `
        SELECT s.story_id,s.user_id, sm.media_url, s.created_at, up.full_name, up.avatar_url
        FROM Stories s
        JOIN StoryMedia sm ON s.story_id = sm.story_id
        JOIN UserProfiles up ON up.user_id = s.user_id
        WHERE (s.user_id =? AND s.story_id = ?)
        AND s.expires_at > NOW()
        ORDER BY s.created_at DESC
      `;
    }

    const [stories] = await db.query(sql, [user_id, story_id]);
    res.json(stories);
  } catch (error) {
    console.error("Error fetching stories:", error);
    res.status(500).json({ message: "Server error!" });
  }
};

exports.viewStory = async (req, res) => {
  const { storyId } = req.params;
  const viewerId = req.user.user_id;
  console.log("view",viewerId, storyId);
  const story = await db.query('SELECT user_id FROM stories WHERE story_id = ?', [storyId]);
  if(viewerId === story[0][0].user_id) {
    // console.log("you view your own story");
    return res.status(200).json({ok: true, message: 'ok'});
  } 
  try {
      const existing = await db.query(
          'SELECT * FROM StoryViews WHERE story_id = ? AND viewer_id = ?',
          [storyId, viewerId]
      );
      // console.log(existing[0].length);
      if (existing[0].length==0) {
          // console.log("ok bro");
          await db.query(
              'INSERT INTO StoryViews (view_id,story_id, viewer_id) VALUES (?,?, ?)',
              [uuidv4(),storyId, viewerId]
          );
      }

      res.status(200).json({ message: 'View recorded' });
  } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error recording view' });
  }
};
exports.getStoryView = async (req, res) => {
    const { storyId } = req.params;
    // console.log("getstrview",storyId);
    const {user_id} = req.user;
    // console.log("get View",storyId);
    const story = await db.query('SELECT user_id FROM stories WHERE story_id = ?', [storyId]);
    if(story[0][0].user_id!==user_id){
      // console.log("debug",user_id,story[0][0].user_id);
      return res.status(200).json({message:"cút"});
    }
    try {
        const [result] = await db.query(
          `SELECT users.user_id
          FROM StoryViews
          JOIN users ON users.user_id = StoryViews.viewer_id
          WHERE StoryViews.story_id = ?`,
          [storyId]
      );
        res.status(200).json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching views' });
    }
};