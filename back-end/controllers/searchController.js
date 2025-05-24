const { parse } = require("tough-cookie");
const db = require("../models/db");

exports.finds = async (req, res) => {
    const { q, user_id } = req.query;
    const {page = 1, limit = 10} = req.query;
    const offset = (page - 1) * limit; // Tính toán offset dựa trên trang và giới hạn
    if (!q || !user_id) {
        return res.status(400).json({ message: "Thiếu thông tin tìm kiếm" });
    }

    const searchQuery = `%${q}%`;

    try {
        const postsSQL = `
            SELECT DISTINCT 
                p.post_id, 
                p.user_id, 
                pc.content, 
                pc.privacy_level, 
                p.created_at

            FROM Posts p
            JOIN Users u ON p.user_id = u.user_id
            JOIN PostContents pc ON p.post_id = pc.post_id
            LEFT JOIN PostMedia pm ON p.post_id = pm.post_id AND pm.media_order = 1
            WHERE 
                (pc.content LIKE ? OR pm.media_url LIKE ?)
                AND (
                    pc.privacy_level = 'public'  
                    OR p.user_id IN (
                        SELECT 
                            CASE 
                                WHEN f.user_id1 = ? THEN f.user_id2
                                ELSE f.user_id1
                            END
                        FROM Friendships f
                        WHERE ? IN (f.user_id1, f.user_id2)
                    )
                )
            LiMIT ? OFFSET ?;
        `;

        const usersSQL = `
            SELECT u.user_id
            FROM Users u
            LEFT JOIN UserProfiles up ON u.user_id = up.user_id
            WHERE (up.full_name LIKE ? OR u.username LIKE ?)
            AND u.user_id <> ?
            LiMIT ? OFFSET ?; 
        `;

        const [posts, users] = await Promise.all([
            db.query(postsSQL, [searchQuery, searchQuery, user_id, user_id,parseInt(limit), parseInt(offset)]),
            db.query(usersSQL, [searchQuery, searchQuery, user_id,parseInt(limit), parseInt(offset)])
        ]);

        res.json({
            posts: posts[0], 
            users: users[0]   
        });

    } catch (error) {
        console.error("Lỗi khi tìm kiếm:", error);
        res.status(500).json({ error: "Lỗi server khi tìm kiếm" });
    }
};
