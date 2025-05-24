const db = require("../models/db");

exports.getContacts = async (req, res) => {
    const { user_id } = req.user;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit; 
    if (!user_id) {
        return res.status(400).json({ success: false, message: "Thiếu user_id" });
    }
    try {
        console.log("Executing query for user_id:", user_id);

        const query = `
            SELECT DISTINCT u.user_id, u.username, u.email, up.full_name, up.avatar_url
            FROM Messages m
            JOIN ConversationParticipants cp1 ON m.conversation_id = cp1.conversation_id
            JOIN ConversationParticipants cp2 ON m.conversation_id = cp2.conversation_id
            JOIN Users u ON cp2.user_id = u.user_id
            JOIN Userprofiles up ON u.user_id = up.user_id
            WHERE cp1.user_id = ? 
            AND cp2.user_id <> ?
            LIMIT ? OFFSET ?;
        `;
        
        const [rows] = await db.query(query, [user_id, user_id, parseInt(limit), parseInt(offset)]);

        console.log("Query Result:", rows);

        if (rows.length === 0) {
            return res.status(200).json({ success: false, message: "Không có liên hệ nào!" });
        }

        res.json(rows);
    } catch (error) {
        console.error("Lỗi:", error);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
};
