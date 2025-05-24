const db = require("./db"); 
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");

const User = {
    findByEmail: async (email) => {
        console.log("Tìm kiếm người dùng với email:", email);
        const query = `SELECT * FROM Users WHERE email = ? LIMIT 1`;
        const connection = await db.getConnection();

        try {
            const [rows] = await connection.query(query, [email]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error("Lỗi truy vấn findByEmail:", error);
            throw error;
        } finally {
            connection.release();
        }
    },
    create: async ({ fullName, username, email, password }) => {
        const userId = uuidv4();
        const userQuery = "INSERT INTO Users (user_id, username, email, password_hash) VALUES (?, ?, ?, ?)";
        const profileQuery = "INSERT INTO UserProfiles (user_id, full_name) VALUES (?, ?)";
        
        const connection = await db.getConnection();
        try {
            await connection.query(userQuery, [userId, username, email, password]);
            await connection.query(profileQuery, [userId, fullName]); 
            return { userId };
        } catch (error) {
            throw error;
        } finally {
            connection.release(); 
        }
    },

    findByUsername: async (username) => {
        const query = "SELECT * FROM Users WHERE username = ?";
        const connection = await db.getConnection();
        try {
            const [rows] = await connection.query(query, [username]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            throw error;
        } finally {
            connection.release();
        }
    },

    findByFullName: async (fullName) => {
        const query = `
            SELECT u.user_id, u.username, u.email, up.full_name, up.bio, up.avatar_url 
            FROM Users u 
            JOIN UserProfiles up ON u.user_id = up.user_id
            WHERE up.full_name LIKE ?`; 

        const connection = await db.getConnection();
        try {
            const [users] = await connection.query(query, [`%${fullName}%`]); 
            return users;
        } catch (error) {
            throw error;
        } finally {
            connection.release(); 
        }
    },
    findByGoogleId: async (googleId) => {
        const query = "SELECT * FROM Users WHERE google_id = ?";
        const connection = await db.getConnection();
        try {
            const [rows] = await connection.query(query, [googleId]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            throw error;
        } finally {
            connection.release();
        }
    },
    createWithSocial: async ({ socialId, email, username, fullName, provider,avatarUrl }) => {
        const userId = uuidv4();
        const password = Math.random().toString(36).slice(-8);  
        const hashedPassword = await bcrypt.hash(password, 10); 
    
        const userQuery = "INSERT INTO Users (user_id, social_id, username, email, password_hash, provider) VALUES (?, ?, ?, ?, ?, ?)";
        const profileQuery = "INSERT INTO UserProfiles (user_id, full_name,avatar_url) VALUES (?, ?, ?)";
    
        const connection = await db.getConnection();
        try {
            await connection.query(userQuery, [userId, socialId, username, email, hashedPassword, provider]);
            await connection.query(profileQuery, [userId, fullName,avatarUrl]);
            console.log("User created with social login:", { username, fullName,avatarUrl });
            return { userId, generatedPassword: password };  
        } catch (error) {
            throw error;
        } finally {
            connection.release();
        }
    },
    changePassword: async (userId, currentPassword, newPassword) => {
        const connection = await db.getConnection();
        try {
            const [rows] = await connection.query("SELECT password_hash FROM Users WHERE user_id = ?", [userId]);
            console.log(rows);
            if (rows.length === 0) {
                throw new Error("Người dùng không tồn tại.");
            }
    
            const user = rows[0];
            const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
            if (!isMatch) {
                throw new Error("Mật khẩu hiện tại không đúng.");
            }
    
            const hashedPassword = await bcrypt.hash(newPassword, 10);
    
            await connection.query("UPDATE Users SET password_hash = ? WHERE user_id = ?", [hashedPassword, userId]);
    
            return true;
        } catch (error) {
            throw error;
        } finally {
            connection.release();
        }
    },
    getAllUsers: async (req, res) => {
        const connection = await db.getConnection();
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit; // Tính toán offset dựa trên trang và giới hạn
        try {
            const [rows] = await connection.query(`
                SELECT 
                    u.user_id,
                    u.username,
                    u.email,
                    COALESCE(p.post_count, 0) AS total_posts,
                    COALESCE(f.friend_count, 0) AS total_friends,
                    COALESCE(m.sent_messages, 0) AS messages_sent,
                    COALESCE(ms.received_messages, 0) AS messages_received,
                    COALESCE(c.comment_count, 0) AS total_comments,
                    COALESCE(r.reaction_count, 0) AS total_reactions
                FROM Users u
                LEFT JOIN (
                    SELECT user_id, COUNT(*) AS post_count
                    FROM Posts
                    GROUP BY user_id
                ) p ON u.user_id = p.user_id
                LEFT JOIN (
                    SELECT user_id1 AS user_id, COUNT(*) AS friend_count
                    FROM Friendships
                    GROUP BY user_id1
                ) f ON u.user_id = f.user_id
                LEFT JOIN (
                    SELECT sender_id AS user_id, COUNT(*) AS sent_messages
                    FROM Messages
                    GROUP BY sender_id
                ) m ON u.user_id = m.user_id
                LEFT JOIN (
                    SELECT user_id, COUNT(*) AS received_messages
                    FROM MessageStatus
                    GROUP BY user_id
                ) ms ON u.user_id = ms.user_id
                LEFT JOIN (
                    SELECT user_id, COUNT(*) AS comment_count
                    FROM Comments
                    GROUP BY user_id
                ) c ON u.user_id = c.user_id
                LEFT JOIN (
                    SELECT user_id, COUNT(*) AS reaction_count
                    FROM Reactions
                    GROUP BY user_id
                ) r ON u.user_id = r.user_id
                LIMIT ? OFFSET ?;
            `, [parseInt(limit), parseInt(offset)]);
    
            return rows;
        } catch (error) {
            console.error("Error fetching users with stats:", error);
            throw error;
        } finally {
            connection.release();
        }
    },
    
    updateUser: async (req, res) => {
        const connection = await db.getConnection();
        const { id } = req.params;
        const { username, email, avatar } = req.body;
    
        try {
            const [result] = await connection.query(
                "UPDATE users SET username = ?, email = ?, avatar = ? WHERE id = ?",
                [username, email, avatar, id]
            );
    
            return result;
        } catch (error) {
            console.error("Error updating user:", error);
            throw error;
        } finally {
            connection.release();
        }
    },
    async deleteUser(id) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
    
            // 1. Xoá thông báo
            await connection.query("DELETE FROM NotificationDetails WHERE actor_id = ?", [id]);
            await connection.query("DELETE FROM Notifications WHERE user_id = ?", [id]);
    
            // 2. Xoá reactions
            await connection.query("DELETE FROM Reactions WHERE user_id = ?", [id]);
    
            // 3. Xoá comments (bao gồm cả comment con)
            await connection.query("DELETE FROM Comments WHERE user_id = ?", [id]);
    
            // 4. Xoá message status
            await connection.query("DELETE FROM MessageStatus WHERE user_id = ?", [id]);
            console.log(5);
            // 5. Xoá message content/media → messages
            const [userMessages] = await connection.query("SELECT message_id FROM Messages WHERE sender_id = ?", [id]);
            if (userMessages.length > 0) {
                const messageIds = userMessages.map(msg => msg.message_id);
                await connection.query("DELETE FROM MessageMedia WHERE message_id IN (?)", [messageIds]);
                await connection.query("DELETE FROM MessageContents WHERE message_id IN (?)", [messageIds]);
                await connection.query("DELETE FROM Messages WHERE message_id IN (?)", [messageIds]);
            }
            console.log(6);
            // 6. Xoá participant khỏi conversations
            await connection.query("DELETE FROM ConversationParticipants WHERE user_id = ?", [id]);
    
            // 7. Xoá friendships & requests
            await connection.query("DELETE FROM Friendships WHERE user_id1 = ? OR user_id2 = ?", [id, id]);
            await connection.query("DELETE FROM FriendshipRequests WHERE sender_id = ? OR receiver_id = ?", [id, id]);
    
            // 8. Xoá story views
            await connection.query("DELETE FROM StoryViews WHERE viewer_id = ?", [id]);
    
            // 9. Xoá stories và media liên quan
            const [stories] = await connection.query("SELECT story_id FROM Stories WHERE user_id = ?", [id]);
            if (stories.length > 0) {
                const storyIds = stories.map(s => s.story_id);
                await connection.query("DELETE FROM StoryMedia WHERE story_id IN (?)", [storyIds]);
                await connection.query("DELETE FROM StoryViews WHERE story_id IN (?)", [storyIds]);
                await connection.query("DELETE FROM Stories WHERE story_id IN (?)", [storyIds]);
            }
    
            // 10. Xoá posts và media liên quan
            const [posts] = await connection.query("SELECT post_id FROM Posts WHERE user_id = ?", [id]);
            if (posts.length > 0) {
                const postIds = posts.map(p => p.post_id);
                await connection.query("DELETE FROM PostMedia WHERE post_id IN (?)", [postIds]);
                await connection.query("DELETE FROM PostContents WHERE post_id IN (?)", [postIds]);
                await connection.query("DELETE FROM Comments WHERE post_id IN (?)", [postIds]); // đảm bảo thêm nếu cần
                await connection.query("DELETE FROM Posts WHERE post_id IN (?)", [postIds]);
            }
    
            // 11. Xoá profile & settings
            await connection.query("DELETE FROM UserProfiles WHERE user_id = ?", [id]);
            await connection.query("DELETE FROM UserSettings WHERE user_id = ?", [id]);
    
            // 12. Cuối cùng xoá user
            const [result] = await connection.query("DELETE FROM Users WHERE user_id = ?", [id]);
    
            await connection.commit();
            return result;
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    },         
    countUsers: async () => {
        
        try {
            const [rows] = await db.query('SELECT COUNT(*) as totalUsers FROM Users');
            return rows[0].totalUsers;
        } catch (err) {
            console.error('Error counting users:', err);
            throw err;
        }
    },
};

module.exports = User;
