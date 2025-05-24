const db = require("../models/db");
const { v4: uuidv4, parse } = require("uuid");

exports.createNotify = async (req, res) => {
    const { user_id } = req.user;
    const { type, receiver_id, target_type, target_id, content } = req.body;
    console.log(user_id, type, target_type, target_id, content);
    if (!user_id || !type  || !target_type || !target_id) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const notification_id = uuidv4();

        await db.execute(
            `INSERT INTO Notifications (notification_id, user_id, type)
             VALUES (?, ?, ?)`,
            [notification_id, user_id, type]
        );

        await db.execute(
            `INSERT INTO NotificationDetails (notification_id, actor_id, target_type, target_id, content)
             VALUES (?, ?, ?, ?, ?)`,
            [notification_id,receiver_id , target_type, target_id, content || null]
        );

        res.json({
            success: true,
            notification: {
                notification_id,
                user_id,
                type,
                user_id,
                target_type,
                target_id,
                content
            }
        });

    } catch (error) {
        console.error("Error creating notification:", error);
        res.status(500).json({ error: "Server error" });
    }
};
exports.getNotificationsByUserId = async (req, res) => {
    const { user_id } = req.user;
    const { page = 1,limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    if (!user_id) {
        return res.status(400).json({ error: "Missing user_id" });
    }

    try {
        const sql =`
            SELECT 
                n.notification_id,
                n.user_id,
                n.type,
                n.created_at,
                n.is_read,
                d.actor_id,
                d.target_type,
                d.target_id,
                d.content

            FROM Notifications n
            LEFT JOIN NotificationDetails d ON n.notification_id = d.notification_id
            WHERE d.actor_id = ?
            ORDER BY n.created_at DESC
            LIMIT ? OFFSET ?
        `;
        const [notifications] = await db.query(sql, [user_id, parseInt(limit), parseInt(offset)]);

        res.json({ user_id, notifications });
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ error: "Server error" });
    }
};
exports.markAsRead = async (req, res) => {
    const { user_id } = req.user;
  
    const query = `
      UPDATE Notifications
      SET is_read = TRUE
      WHERE notification_id IN (
        SELECT nd.notification_id
        FROM NotificationDetails nd
        WHERE nd.actor_id = ? AND is_read = FALSE
      );
    `;
  
    try {
      const [result] = await db.query(query, [user_id]);
  
      return res.status(200).json({
        message: 'Notifications marked as read',
        affectedRows: result.affectedRows,
      });
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
};
  