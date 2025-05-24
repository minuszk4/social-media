const db = require("../models/db");
const redis = require("../redisClient"); 
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const {cloudinary, storage } = require('../cloud/cloudinary');

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'video/mp4'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and MP4 are allowed.'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024 
    }
});

exports.getFrPosts = async (req, res) => {
    const { user_id } = req.user; 
    if (!user_id) {
        return res.status(400).json({ error: "Missing user_id parameter" });
    }

    const cacheKey = `feed:user:${user_id}`;

    try {
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            console.log("✅ Cache hit");
            return res.status(200).json(JSON.parse(cachedData));
        }

        console.log("❌ Cache miss");

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
            WHERE (
                (p.user_id IN (SELECT user_id2 FROM Friendships WHERE user_id1 = ?)
                OR p.user_id IN (SELECT user_id1 FROM Friendships WHERE user_id2 = ?)
                OR p.user_id = ?)
            )
            ORDER BY p.created_at DESC;
        `;

        const [posts] = await db.query(postsQuery, [user_id, user_id, user_id]);

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
                    media: media || []
                };
            })
        );

        await redis.set(cacheKey, JSON.stringify(cleanedPosts), 'EX', 5);

        res.status(200).json(cleanedPosts);
    } catch (error) {
        console.error("Error in getFrPosts:", error);
        res.status(500).json({ error: error.message || "Internal server error" });
    }
};

exports.getPosts = async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const { user_id } = req.user;
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
            WHERE 
                pc.privacy_level = 'public'
                OR p.user_id = ? 
                OR (
                    pc.privacy_level = 'friends'
                    AND (p.user_id IN (SELECT user_id2 FROM Friendships WHERE user_id1 = ?)
                    or p.user_id IN (SELECT user_id1 FROM Friendships WHERE user_id2 = ?))
                )
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?;
        `;

        const [posts] = await db.query(postsQuery, [user_id,user_id,user_id,parseInt(limit), parseInt(offset)]);

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

        await redis.set(cacheKey, JSON.stringify(cleanedPosts), 'EX', 5);

        res.status(200).json(cleanedPosts);
    } catch (error) {
        console.error("Error in getPosts:", error);
        res.status(500).json({ error: error.message || "Internal server error" });
    }
};

exports.createPost = [
    upload.array('media', 4), 
    async (req, res) => {
        const { user_id } = req.user;
        const text = req.body.text.trim();

        const privacy_level = 'public';
        const files = req.files;

        try {
            const post_id = crypto.randomUUID();
            
            await db.query('START TRANSACTION');

            await db.query(
                "INSERT INTO Posts (post_id, user_id) VALUES (?, ?)",
                [post_id, user_id]
            );

            await db.query(
                "INSERT INTO PostContents (post_id, content, privacy_level) VALUES (?, ?, ?)",
                [post_id, text, privacy_level]
            );

            if (files && files.length > 0) {
                const mediaPromises = files.map((file, index) => {
                    const media_id = crypto.randomUUID();
                    const media_type = file.mimetype.startsWith('image') ? 'image' : 'video';
                    const media_url = file.path;

                    return db.query(
                        "INSERT INTO PostMedia (media_id, post_id, media_type, media_url, media_order) VALUES (?, ?, ?, ?, ?)",
                        [media_id, post_id, media_type, media_url, index + 1]
                    );
                });

                await Promise.all(mediaPromises);
            }

            await redis.del(`feed:user:${user_id}`);
            const keys = await redis.keys('posts:all:page:*');
            if (keys.length > 0) {
                await redis.del(keys);
            }
            await redis.del(`myposts:user:${user_id}:page:*`);
            await redis.del(`profileposts:user:${user_id}:page:*`);

            await db.query('COMMIT');
            res.status(201).json({ message: "Post created successfully!", post_id });
        } catch (error) {
            await db.query('ROLLBACK');
            console.error("Error in createPost:", error);
            res.status(500).json({ error: error.message || "Internal server error" });
        }
    }
];

exports.getMyPosts = async (req, res) => {
    const { user_id } = req.user;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit; 
    if (!user_id) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const cacheKey = `myposts:user:${user_id}:page:${page}:limit:${limit}`;

    try {
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            console.log("✅ Cache hit for my posts");
            return res.status(200).json(JSON.parse(cachedData));
        }

        console.log("❌ Cache miss for my posts");
        const postsQuery = `
            SELECT 
                p.post_id, 
                p.user_id, 
                pc.content, 
                pc.privacy_level, 
                p.created_at,
                up.full_name,
                up.avatar_url
            FROM Posts p
            JOIN PostContents pc ON p.post_id = pc.post_id
            JOIN UserProfiles up ON up.user_id = p.user_id
            WHERE p.user_id = ?
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?;
        `;

        const [posts] = await db.query(postsQuery, [user_id, parseInt(limit), parseInt(offset)]);

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

        await redis.set(cacheKey, JSON.stringify(cleanedPosts), 'EX', 60);

        res.status(200).json(cleanedPosts);
    } catch (error) {
        console.error("Error in getMyPosts:", error.stack);
        res.status(500).json({ error: error.message || "Internal server error" });
    }
};

exports.profilePost = async (req, res) => {
    const { user_id } = req.user;
    if (!user_id) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const { profile_id } = req.query;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const cacheKey = `profileposts:user:${profile_id}:page:${page}:limit:${limit}`;

    try {
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            console.log("✅ Cache hit for profile posts");
            return res.status(200).json(JSON.parse(cachedData));
        }

        console.log("❌ Cache miss for profile posts");
        const friendCheckQuery = `
            SELECT * FROM Friendships 
            WHERE (user_id1 = ? AND user_id2 = ?) OR (user_id1 = ? AND user_id2 = ?)
        `;

        const [friendResult] = await db.query(friendCheckQuery, [user_id, profile_id, profile_id, user_id]);
        const isFriend = friendResult.length > 0;
        let postsQuery;

        if (isFriend) {
            postsQuery = `
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
                WHERE p.user_id = ?
                ORDER BY p.created_at DESC
                LIMIT ? OFFSET ?;
            `;
        } else {
            postsQuery = `
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
                WHERE p.user_id = ? AND pc.privacy_level = 'public'
                ORDER BY p.created_at DESC
                LIMIT ? OFFSET ?;
            `;
        }

        const [posts] = await db.query(postsQuery, [profile_id, parseInt(limit), parseInt(offset)]);

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

        await redis.set(cacheKey, JSON.stringify(cleanedPosts), 'EX', 60);

        res.status(200).json(cleanedPosts);
    } catch (error) {
        console.error("Error in profilePost:", error.stack);
        res.status(500).json({ error: error.message || "Internal server error" });
    }
};

exports.getPostMedia = async (req, res) => {
    const { post_id } = req.params;
    const cacheKey = `postmedia:${post_id}`;

    try {
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            console.log("✅ Cache hit for post media");
            return res.status(200).json(JSON.parse(cachedData));
        }

        console.log("❌ Cache miss for post media");
        const query = `
            SELECT 
                media_id,
                media_type,
                media_url,
                media_order,
                created_at
            FROM PostMedia
            WHERE post_id = ?
            ORDER BY media_order ASC;
        `;

        const [media] = await db.query(query, [post_id]);

        await redis.set(cacheKey, JSON.stringify(media), 'EX', 300);

        res.status(200).json(media);
    } catch (error) {
        console.error("Error in getPostMedia:", error);
        res.status(500).json({ error: error.message || "Internal server error" });
    }
};

exports.updatePost = [
    upload.array('media', 4),
    async (req, res) => {
        const { post_id } = req.params;
        const { user_id } = req.user;
        const [posts] = await db.query(
            "SELECT user_id FROM Posts WHERE post_id = ?",
            [post_id]
        );
        if (posts[0].user_id !== user_id) {
            return res.status(403).json({ error: "Bạn không có quyền thao tác bài viết này." });
        }
        const { text, keepMedia, privacy_level } = req.body;
        const files = req.files;
        const keepMediaArray = keepMedia ? JSON.parse(keepMedia) : [];

        try {
            await db.query("START TRANSACTION");

            await db.query(
                "UPDATE PostContents SET content = ?, privacy_level = ? WHERE post_id = ?",
                [text, privacy_level || 'public', post_id]
            );
            const [oldMedia] = await db.query(
                "SELECT media_id, media_url FROM PostMedia WHERE post_id = ?",
                [post_id]
            );

            const mediaToDelete = oldMedia.filter(m => !keepMediaArray.includes(m.media_id));

            for (const media of mediaToDelete) {
                const publicId = media.media_url.split('/').pop().split('.')[0];
                await cloudinary.uploader.destroy(publicId);
                await db.query("DELETE FROM PostMedia WHERE media_id = ?", [media.media_id]);
            }

            if (files && files.length > 0) {
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const media_id = crypto.randomUUID();
                    const media_type = file.mimetype.startsWith("image") ? "image" : "video";
                    const uploadResult = await cloudinary.uploader.upload(file.path);
                    const media_url = uploadResult.secure_url;

                    await db.query(
                        "INSERT INTO PostMedia (media_id, post_id, media_type, media_url, media_order) VALUES (?, ?, ?, ?, ?)",
                        [media_id, post_id, media_type, media_url, i + 1]
                    );
                }
            }

            // Invalidate related caches
            await redis.del(`post:${post_id}`);
            await redis.del(`postmedia:${post_id}`);
            await redis.del(`feed:user:${user_id}`);
            await redis.del(`myposts:user:${user_id}:page:*`);
            await redis.del(`profileposts:user:${user_id}:page:*`);
            const keys = await redis.keys('posts:all:page:*');
            if (keys.length > 0) {
                await redis.del(keys);
            }

            await db.query("COMMIT");
            res.status(200).json({ message: "Cập nhật bài viết thành công." });
        } catch (error) {
            await db.query("ROLLBACK");
            console.error("Error in updatePost:", error);
            res.status(500).json({ error: "Lỗi máy chủ, vui lòng thử lại." });
        }
    }
];

exports.deletePost = async (req, res) => {
    const { post_id } = req.params;
    const { user_id } = req.user;

    try {
        await db.query("START TRANSACTION");

        const [media] = await db.query(
            "SELECT media_url FROM PostMedia WHERE post_id = ?",
            [post_id]
        );
        
        for (const item of media) {
            const publicId = item.media_url.split('/').pop().split('.')[0]; 
            await cloudinary.uploader.destroy(publicId);
        }

        const [comments] = await db.query(
            "SELECT comment_id FROM Comments WHERE post_id = ?",
            [post_id]
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
            [post_id]
        );

        await db.query("DELETE FROM Comments WHERE post_id = ?", [post_id]);

        await db.query("DELETE FROM Posts WHERE post_id = ?", [post_id]);

        // Invalidate related caches
        await redis.del(`post:${post_id}`);
        await redis.del(`postmedia:${post_id}`);
        await redis.del(`feed:user:${user_id}`);
        await redis.del(`myposts:user:${user_id}:page:*`);
        await redis.del(`profileposts:user:${user_id}:page:*`);
        const keys = await redis.keys('posts:all:page:*');
        if (keys.length > 0) {
            await redis.del(keys);
        }

        await db.query("COMMIT");
        res.status(200).json({ message: "Xóa bài viết và các dữ liệu liên quan thành công." });
    } catch (error) {
        await db.query("ROLLBACK");
        console.error("Error in deletePost:", error);
        res.status(500).json({ error: "Không thể xóa bài viết." });
    }
};

exports.getaPost = async (req, res) => {
    const { post_id } = req.params;
    const viewer_id = req.user.user_id;
    const cacheKey = `post:${post_id}`;

    try {
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            console.log("✅ Cache hit for single post");
            return res.status(200).json(JSON.parse(cachedData));
        }

        console.log("❌ Cache miss for single post");
        const accessQuery = `
            SELECT 
                p.user_id AS owner_id,
                pc.privacy_level,
                EXISTS (
                    SELECT 1 FROM Friendships f
                    WHERE (f.user_id1 = ? AND f.user_id2 = p.user_id)
                       OR (f.user_id2 = ? AND f.user_id1 = p.user_id)
                ) AS is_friend
            FROM Posts p
            JOIN PostContents pc ON p.post_id = pc.post_id
            WHERE p.post_id = ?;
        `;

        const [[access]] = await db.query(accessQuery, [viewer_id, viewer_id, post_id]);

        if (!access) {
            return res.status(404).json({ message: "Không tìm thấy bài viết." });
        }

        const { owner_id, privacy_level, is_friend } = access;

        const canView =
            privacy_level === 'public' ||
            (privacy_level === 'private' && viewer_id === owner_id) ||
            (privacy_level === 'friends' && (viewer_id === owner_id || is_friend));

        if (!canView) {
            return res.status(403).json({ message: "Bạn không có quyền truy cập bài viết này." });
        }

        const postQuery = `
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
            WHERE p.post_id = ?;
        `;
        const [[post]] = await db.query(postQuery, [post_id]);

        const mediaQuery = `
            SELECT media_id, media_type, media_url, media_order
            FROM PostMedia
            WHERE post_id = ?
            ORDER BY media_order ASC;
        `;
        const [media] = await db.query(mediaQuery, [post_id]);

        const fullPost = {
            ...post,
            media: media || [],
        };

        await redis.set(cacheKey, JSON.stringify(fullPost), 'EX', 60);

        res.status(200).json(fullPost);
    } catch (error) {
        console.error("Error in getaPost:", error);
        res.status(500).json({ error: error.message || "Internal server error" });
    }
};