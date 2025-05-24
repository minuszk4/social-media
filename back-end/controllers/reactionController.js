const db = require("../models/db");

exports.getReactions = async (req, res) => {
    try {
        const { target_id, target_type } = req.params;

        if (!target_id || !target_type) {
            return res.status(400).json({ message: "Thiếu target_id hoặc target_type" });
        }

        const query = `
            SELECT user_id, reaction_type 
            FROM Reactions 
            WHERE target_id = ? AND target_type = ?
        `;
        const [results] = await db.execute(query, [target_id, target_type]);

        res.status(200).json({ success: true, reactions: results });
    } catch (error) {
        console.error("Lỗi khi lấy reactions:", error);
        res.status(500).json({ message: "Lỗi server" });
    }
};

exports.postReactions = async (req, res) => {
    try {
        const { user_id } = req.user;
        const {  target_id, target_type, reaction_type } = req.body;

        if (!user_id || !target_id || !target_type || !reaction_type) {
            return res.status(400).json({ message: "Thiếu dữ liệu đầu vào" });
        }

        const checkQuery = `
            SELECT reaction_id FROM Reactions 
            WHERE user_id = ? AND target_id = ? AND target_type = ?
        `;
        const [existing] = await db.execute(checkQuery, [user_id, target_id, target_type]);

        if (existing.length > 0) {
            if (reaction_type === "remove") {
                const deleteQuery = `
                    DELETE FROM Reactions 
                    WHERE user_id = ? AND target_id = ? AND target_type = ?
                `;
                await db.execute(deleteQuery, [user_id, target_id, target_type]);

                return res.status(200).json({ success: true, message: "Gỡ reaction thành công" });
            } else {
                const updateQuery = `
                    UPDATE Reactions 
                    SET reaction_type = ? 
                    WHERE user_id = ? AND target_id = ? AND target_type = ?
                `;
                await db.execute(updateQuery, [reaction_type, user_id, target_id, target_type]);

                return res.status(200).json({ success: true, message: "Cập nhật reaction thành công" });
            }
        } else {
            const insertQuery = `
                INSERT INTO Reactions (reaction_id, user_id, target_type, target_id, reaction_type) 
                VALUES (UUID(), ?, ?, ?, ?)
            `;
            await db.execute(insertQuery, [user_id, target_type, target_id, reaction_type]);

            return res.status(201).json({ success: true, message: "Thả reaction thành công" });
        }
    } catch (error) {
        console.error("Lỗi :", error);
        res.status(500).json({ message: "Lỗi server" });
    }
};
