const db = require("../models/db");
const redis = require("../redisClient");
const User = require("../models/user");
const cloudinary = require('../cloud/cloudinary');
const upload = require('../cloud/upload');

exports.getUserProfile = async (req, res) => {
    const { profileId } = req.params;
    const cacheKey = `user:profile:${profileId}`;

    try {
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            console.log("✅ Cache hit for user profile");
            return res.json(JSON.parse(cachedData));
        }

        console.log("❌ Cache miss for user profile");

        const [users] = await db.query(
            `SELECT u.user_id, u.username, u.email, p.full_name, p.bio, p.avatar_url 
            FROM Users u 
            LEFT JOIN UserProfiles p ON u.user_id = p.user_id
            WHERE u.user_id = ?`,
            [profileId]
        );

        if (!users || users.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const userProfile = users[0];
        await redis.set(cacheKey, JSON.stringify(userProfile), 'EX', 300); // Cache for 5 minutes

        res.json(userProfile);
    } catch (error) {
        console.error("Error fetching profile:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

exports.updateUserProfile = async (req, res) => {
    const { profileId } = req.params;
    if (profileId !== req.user.user_id) {
        return res.status(403).json({ message: "You don't have permission" });
    }
    const { full_name, bio } = req.body;
    let avatar_url = null;

    try {
        const [userExists] = await db.query("SELECT * FROM UserProfiles WHERE user_id = ?", [profileId]);
        if (userExists.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const currentProfile = userExists[0];
        const updates = {};
        const params = [];

        if (full_name && full_name !== currentProfile.full_name) {
            updates.full_name = full_name;
            params.push(full_name);
        }
        if (bio && bio !== currentProfile.bio) {
            updates.bio = bio;
            params.push(bio);
        }
        if (req.file) {
            avatar_url = req.file.path;
            updates.avatar_url = avatar_url;
            params.push(avatar_url);
        }
        if (Object.keys(updates).length === 0) {
            return res.json({ 
                message: "No changes detected",
                full_name: currentProfile.full_name,
                bio: currentProfile.bio,
                avatar_url: currentProfile.avatar_url
            });
        }

        const setClause = Object.keys(updates)
            .map(field => `${field} = ?`)
            .join(", ") + ", updated_at = NOW()";
        
        const query = `UPDATE UserProfiles SET ${setClause} WHERE user_id = ?`;
        params.push(profileId);

        const [result] = await db.query(query, params);

        if (result.affectedRows === 0) {
            return res.status(400).json({ message: "No changes made" });
        }

        await redis.del(`user:profile:${profileId}`);

        res.json({ 
            message: "Profile updated successfully",
            full_name: updates.full_name || currentProfile.full_name,
            bio: updates.bio || currentProfile.bio,
            avatar_url: updates.avatar_url || currentProfile.avatar_url
        });
    } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

exports.UpdatePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const { user_id } = req.user;

    try {
        await User.changePassword(user_id, currentPassword, newPassword);

        await redis.del(`user:profile:${user_id}`);

        res.json({ message: "Đổi mật khẩu thành công." });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};