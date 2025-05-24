const db = require('./db');
const redis = require("../redisClient"); 
const fs = require('fs');
const {cloudinary,storage} = require('../cloud/cloudinary')
// console.log(cloudinary);  
const upload = require('../cloud/upload')
const Post = {
    getAllPosts:async (req, res) => {
        const { user_id, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;
      
        const cacheKey = `posts:all:page:${page}:limit:${limit}`;
      
        try {
          const cachedData = await redis.get(cacheKey);
          if (cachedData) {
            console.log("✅ Cache hit");
            return res.status(200).json(JSON.parse(cachedData));
          }
      
          console.log("❌ Cache miss - Fetching from DB");
      
          const postsQuery = `
            SELECT 
              p.post_id, 
              p.user_id, 
              u.username, 
              up.avatar_url, 
              pc.content, 
              pc.privacy_level, 
              p.created_at,
              up.full_name
            FROM Posts p
            JOIN Users u ON p.user_id = u.user_id
            LEFT JOIN UserProfiles up ON p.user_id = up.user_id
            JOIN PostContents pc ON p.post_id = pc.post_id
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?;
          `;
      
          const [posts] = await db.query(postsQuery, [parseInt(limit), parseInt(offset)]);
      
          const cleanedPosts = await Promise.all(
            posts.map(async (post) => {
              const mediaQuery = `
                SELECT media_id, media_type, media_url, media_order
                FROM PostMedia
                WHERE post_id = ?
                ORDER BY media_order ASC;
              `;
              const [media] = await db.query(mediaQuery, [post.post_id]);
              return {
                ...post,
                media: media || [],
              };
            })
          );
      
          await redis.set(cacheKey, JSON.stringify(cleanedPosts), 'EX', 50);
      
         return cleanedPosts;
        } catch (error) {
          console.error("Error in getAllPosts:", error);
          return null;
        }
    },
    getPostById: async (postId) => {
        const cacheKey = `post:${postId}`;
        try {
            const cachedData = await redis.get(cacheKey);
            if (cachedData) {
                console.log("✅ Cache hit for post:", postId);
                return JSON.parse(cachedData);
            }

            console.log("❌ Cache miss for post:", postId);
            const connection = await db.getConnection();
            try {
                const postQuery = `
                    SELECT 
                        p.post_id, 
                        p.user_id, 
                        u.username, 
                        up.avatar_url, 
                        up.full_name,
                        pc.content, 
                        pc.privacy_level, 
                        p.created_at
                    FROM Posts p
                    JOIN Users u ON p.user_id = u.user_id
                    LEFT JOIN UserProfiles up ON p.user_id = up.user_id
                    JOIN PostContents pc ON p.post_id = pc.post_id
                    WHERE p.post_id = ?;
                `;
                const [posts] = await connection.query(postQuery, [postId]);
                if (posts.length === 0) return null;
                const post = posts[0];
                const mediaQuery = `
                    SELECT media_id, media_type, media_url, media_order
                    FROM PostMedia
                    WHERE post_id = ?
                    ORDER BY media_order ASC;
                `;
                const [media] = await connection.query(mediaQuery, [postId]);
    
                const postData = {
                    ...post,
                    media: media || [],
                };

                await redis.set(cacheKey, JSON.stringify(postData), 'EX', 60);
                return postData;
            } finally {
                connection.release();
            }
        } catch (err) {
            console.error('Error fetching post by ID:', err);
            throw err;
        }
    },    
    deletePost: async (id) => {

      try {
        await db.query("START TRANSACTION");
    
        const [media] = await db.query(
          "SELECT media_url FROM PostMedia WHERE post_id = ?",
          [id]
        );
        for (const item of media) {
          const publicId = item.media_url.split('/').pop().split('.')[0];
          // console.log("publicId:", publicId);  // Kiểm tra publicId
          if (publicId) {
            await cloudinary.uploader.destroy(publicId);
          } else {
            console.log("publicId is not valid");
          }

        }
        
        const [comments] = await db.query(
          "SELECT comment_id FROM Comments WHERE post_id = ?",
          [id]
        );
        const commentIds = comments.map(c => c.comment_id);
    
        if (commentIds.length > 0) {
          await db.query(
            "DELETE FROM Reactions WHERE target_type = 'comment' AND target_id IN (?)",
            [commentIds]
          );
        }

        await db.query(
          "DELETE FROM Reactions WHERE target_type = 'post' AND target_id = ?",
          [id]
        );
    
        await db.query("DELETE FROM Comments WHERE post_id = ?", [id]);
    
        await db.query("DELETE FROM Posts WHERE post_id = ?", [id]);
        await redis.del(`post:${id}`); 
        await redis.del(`posts:count`); 
        const keys = await redis.keys('posts:all:page:*');
        if (keys.length > 0) {
            await redis.del(keys);
        }
        await db.query("COMMIT");
        return  {message: "Xóa bài viết và các dữ liệu liên quan thành công." } ;
      } catch (error) {
        await db.query("ROLLBACK");
        console.error("Error in deletePost:", error);
        return { error: "Không thể xóa bài viết." };
      }
    },
    countPosts: async () => {
        const cacheKey = `posts:count`;
        try {
            const cachedCount = await redis.get(cacheKey);
            if (cachedCount) {
                console.log("✅ Cache hit for posts count");
                return parseInt(cachedCount);
            }

            console.log("❌ Cache miss for posts count");
            const [rows] = await db.query('SELECT COUNT(*) as totalPosts FROM Posts');
            const count = rows[0].totalPosts;

            await redis.set(cacheKey, count.toString(), 'EX', 300);
            return count;
        } catch (err) {
            console.error('Error counting posts:', err);
            throw err;
        }
    },
};

module.exports = Post;
