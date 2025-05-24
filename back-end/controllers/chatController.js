const db = require("../models/db");
const { v4: uuidv4 } = require("uuid");
const { getIo } = require("../sockets/socket"); 
const upload = require("../cloud/upload"); // nơi cấu hình multer + cloudinary

exports.conversation = async (req, res) => {
    const { conversation_id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    // console.log(typeof pageNumber, typeof limitNumber, pageNumber, limitNumber);
    if (isNaN(pageNumber) || isNaN(limitNumber)) {
        return res.status(400).json({ error: "Invalid pagination values" });
    }

    const offset = (pageNumber - 1) * limitNumber;
    // console.log(offset, limitNumber, pageNumber, conversation_id,typeof conversation_id, typeof offset, typeof limitNumber, typeof pageNumber);
    try {
        const query = `
            SELECT 
                m.message_id, 
                m.conversation_id, 
                m.sender_id, 
                m.message_type, 
                mc.content as message, 
                m.created_at AS timestamp, 
                u.full_name, 
                u.avatar_url,
                ms.is_read
            FROM Messages m
            JOIN MessageContents mc ON m.message_id = mc.message_id
            JOIN UserProfiles u ON m.sender_id = u.user_id
            Left JOIN MessageStatus ms ON m.message_id = ms.message_id
            WHERE m.conversation_id = ?
            ORDER BY m.created_at desc
            LIMIT ? OFFSET ?
        `;

        const [rows] = await db.query(query, [conversation_id, limitNumber, offset]);

        const [countRows] = await db.execute(
            `SELECT COUNT(*) AS total FROM Messages WHERE conversation_id = ?`,
            [conversation_id]
        );

        const totalMessages = countRows[0].total;
        const totalPages = Math.ceil(totalMessages / limitNumber);

        res.json({
            messages: rows,
            pagination: {
                page: pageNumber,
                totalPages,
                totalMessages,
                limit: limitNumber
            }
        });
    } catch (error) {
        console.error("Error fetching conversation:", error);
        res.status(500).json({ error: "Server error" });
    }
};
exports.createChat = [
    upload.array('media', 1),
    async (req, res) => {
    const { user_id } = req.user;
    const {  friend_id } = req.body;
    try {
        const [existing] = await db.execute(
            `SELECT c.conversation_id 
            FROM Conversations c
            JOIN ConversationParticipants cp1 ON c.conversation_id = cp1.conversation_id
            JOIN ConversationParticipants cp2 ON c.conversation_id = cp2.conversation_id
            WHERE cp1.user_id = ? AND cp2.user_id = ?`,
            [user_id, friend_id]
        );

        if (existing.length > 0) {
            const [participants] = await db.execute(
                `SELECT cp.user_id, u.full_name 
                FROM ConversationParticipants cp
                JOIN UserProfiles u ON cp.user_id = u.user_id
                WHERE cp.conversation_id = ? AND cp.user_id = ?`,
                [existing[0].conversation_id, friend_id]
            );
            const [messageCount] = await db.execute(
                "SELECT COUNT(*) as totalMessages FROM Messages WHERE conversation_id = ?",
                [existing[0].conversation_id]
            );

            return res.json({
                conversation_id: existing[0].conversation_id,
                user_id: participants[0].user_id,
                full_name: participants[0].full_name,

            });
        }

        const conversation_id = uuidv4();
        const [result] = await db.execute(
            "INSERT INTO Conversations (conversation_id) VALUES (?)", [conversation_id]
        );

        await db.execute(
            "INSERT INTO ConversationParticipants (conversation_id, user_id) VALUES (?, ?), (?, ?)",
            [conversation_id, user_id, conversation_id, friend_id]
        );

        const [friendData] = await db.execute(
            "SELECT full_name FROM UserProfiles WHERE user_id = ?",
            [friend_id]
        );

        
        res.json({
            conversation_id,
            user_id: friend_id,
            full_name: friendData[0]?.full_name || "Unknown",
            
        });
    } catch (error) {
        console.error("Error creating conversation:", error);
        res.status(500).json({ error: "Server error" });
    }
}
]
exports.sendMessage = async (req, res) => {
    const { user_id } = req.user;
    const sender_id = user_id;
    const { conversation_id, message, message_type } = req.body;

    if (!conversation_id || !sender_id || !message_type) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const message_id = uuidv4();
        let content = null;

        await db.execute(
            "INSERT INTO Messages (message_id, conversation_id, sender_id, message_type) VALUES (?, ?, ?, ?)",
            [message_id, conversation_id, sender_id, message_type]
        );

        if (message_type === "text" && message) {
            content = message;
            await db.execute(
                "INSERT INTO MessageContents (message_id, content) VALUES (?, ?)",
                [message_id, content]
            );
        }

        if (message_type === "media" && req.file && req.file.path) {
            content = req.file.path;
            await db.execute(
                "INSERT INTO MessageContents (message_id, content) VALUES (?, ?)",
                [message_id, content]
            );
        }

        const [participants] = await db.execute(
            "SELECT user_id FROM ConversationParticipants WHERE conversation_id = ? AND user_id != ?",
            [conversation_id, sender_id]
        );

        for (const participant of participants) {
            await db.execute(
                "INSERT INTO MessageStatus (status_id, message_id, user_id, is_read) VALUES (UUID(), ?, ?, FALSE)",
                [message_id, participant.user_id]
            );
        }

        const timestamp = new Date().toISOString();
        const newMessage = {
            message_id,
            conversation_id,
            sender_id,
            message: content,
            message_type,
            timestamp
        };

        const io = getIo();
        io.to(conversation_id).emit("receiveMessage", newMessage);

        console.log("Message sent:", newMessage);
        res.json({
            message: "Message sent successfully",
            data: newMessage
        });

    } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ error: "Server error" });
    }
};
exports.getUnreadMessages = async (req, res) => {
    const { user_id } = req.user;
    try {
        const query = `
            SELECT 
                count(ms.is_read) AS unread_count
            FROM Messages m
            JOIN MessageStatus ms ON m.message_id = ms.message_id
            WHERE ms.user_id = ? AND ms.is_read = FALSE
        `;
        const [rows] = await db.query(query, [user_id]);

        res.json(rows);
    } catch (error) {
        console.error("Error fetching unread messages:", error);
        res.status(500).json({ error: "Server error" });
    }
}