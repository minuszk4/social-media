const db = require("../models/db");

exports.sendFriendRequest = async (req, res) => {
    const { user_id } = req.user; 
    const { friend_id } = req.body;
    try {
        const [existingRequest] = await db.query(
            "SELECT * FROM FriendshipRequests WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)",
            [user_id, friend_id, friend_id, user_id]
        );
        
        // Kiểm tra nếu yêu cầu kết bạn đã tồn tại hoặc người dùng đã là bạn
        if (existingRequest && existingRequest.length !== 0) {
            return res.status(400).json({ message: "Friend request already exists or users are already friends." });
        }

        await db.query(
            "INSERT INTO FriendshipRequests (request_id, sender_id, receiver_id, status) VALUES (UUID(), ?, ?, 'pending')",
            [user_id, friend_id]
        );

        res.status(201).json({ message: "Friend request sent successfully!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.acceptFriendRequest = async (req, res) => {
    const { user_id } = req.user; 
    const {  friend_id } = req.body;

    try {
        const [request] = await db.query(
            "SELECT request_id, sender_id, receiver_id FROM FriendshipRequests WHERE sender_id = ? AND receiver_id = ?",
            [friend_id, user_id]
        );

        if (!request || request.length === 0) {
            return res.status(400).json({ message: "Friend request not found or already processed." });
        }

        const { request_id, sender_id, receiver_id } = request[0];

        // Cập nhật trạng thái yêu cầu kết bạn
        await db.query("UPDATE FriendshipRequests SET status = 'accepted' WHERE request_id = ?", [request_id]);

        // Thêm vào bảng Friendships
        await db.query("INSERT INTO Friendships (user_id1, user_id2) VALUES (?, ?)", [sender_id, receiver_id]);
        await db.query("INSERT INTO Friendships (user_id1, user_id2) VALUES (?, ?)", [receiver_id, sender_id]);

        // Xóa yêu cầu kết bạn đã được xử lý
        await db.query("DELETE FROM FriendshipRequests WHERE request_id = ?", [request_id]);

        res.status(200).json({ message: "Friend request accepted!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.rejectFriendRequest = async (req, res) => {
    const { friend_id } = req.body;
    const { user_id } = req.user; // Lấy user_id từ token đã xác thực
    try {
        const [request] = await db.query(
            "SELECT status FROM FriendshipRequests WHERE sender_id = ? and receiver_id = ?",
            [friend_id, user_id]
        );
        if (!request || request.length === 0 || request[0].status !== 'pending') {
            return res.status(400).json({ message: "Friend request is not pending or does not exist." });
        }

        const [result] = await db.query(
            "DELETE FROM FriendshipRequests WHERE sender_id = ?",
            [friend_id]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({ message: "Friend request not found." });
        }

        res.status(200).json({ message: "Friend request rejected!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.unfriend = async (req, res) => {
    const { user_id } = req.user;
    const {  friend_id } = req.body;

    try {
        const [result] = await db.query(
            "DELETE FROM Friendships WHERE (user_id1 = ? AND user_id2 = ?) OR (user_id1 = ? AND user_id2 = ?)",
            [user_id, friend_id, friend_id, user_id]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({ message: "Friendship not found." });
        }

        res.status(200).json({ message: "Unfriended successfully!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// exports.getFriends = async (req, res) => {
//     const { user_id } = req.query;

//     try {
//         const [friends] = await db.query(
//             `SELECT DISTINCT u.user_id, u.username, u.email, up.avatar_url, up.full_name
//             FROM Friendships f
//             JOIN Users u ON u.user_id = CASE 
//                 WHEN f.user_id1 = ? THEN f.user_id2 
//                 ELSE f.user_id1 
//             END
//             LEFT JOIN UserProfiles up ON u.user_id = up.user_id
//             WHERE f.user_id1 = ? OR f.user_id2 = ?`,
//             [user_id, user_id, user_id]
//         );

//         res.status(200).json(friends);
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// };
exports.getFriends = async (req, res) => {
    const { user_id } = req.user;
    const { page = 1, pageSize = 10 } = req.query; 
    try {
        const offset = (page - 1) * pageSize; // Tính toán offset

        const [friends] = await db.query(`
            SELECT DISTINCT u.user_id, u.username, u.email, up.avatar_url, up.full_name
            FROM Friendships f
            JOIN Users u ON u.user_id = CASE 
                WHEN f.user_id1 = ? THEN f.user_id2 
                ELSE f.user_id1 
            END
            LEFT JOIN UserProfiles up ON u.user_id = up.user_id
            WHERE f.user_id1 = ? OR f.user_id2 = ?
            LIMIT ? OFFSET ?
        `, [user_id, user_id, user_id, parseInt(pageSize), parseInt( offset)]);

        const [[{ totalCount }]] = await db.query(`
            SELECT COUNT(DISTINCT u.user_id) AS totalCount
            FROM Friendships f
            JOIN Users u ON u.user_id = CASE 
                WHEN f.user_id1 = ? THEN f.user_id2 
                ELSE f.user_id1 
            END
            WHERE f.user_id1 = ? OR f.user_id2 = ?
        `, [user_id, user_id, user_id]);

        const totalPages = Math.ceil(totalCount / pageSize);

        res.status(200).json({
            friends,
            pagination: {
                page,
                pageSize,
                totalPages,
                totalCount,
            },
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
};

exports.getFriendStatus = async (req, res) => {
    const { user_id } = req.user; // Lấy user_id từ token đã xác thực
    const { friend_id } = req.query;

    if (!user_id || !friend_id) {
        return res.status(400).json({ error: "Missing user_id or friend_id parameter" });
    }

    try {
        const friendQuery = `
            SELECT * FROM Friendships 
            WHERE (user_id1 = ? AND user_id2 = ?) OR (user_id1 = ? AND user_id2 = ?);
        `;
        const [friendResult] = await db.query(friendQuery, [user_id, friend_id, friend_id, user_id]);

        if (friendResult.length > 0) {
            return res.status(200).json({ status: "friends" });
        }

        // Kiểm tra yêu cầu kết bạn
        const requestQuery = `
            SELECT * FROM FriendshipRequests 
            WHERE (sender_id = ? AND receiver_id = ?) OR (receiver_id = ? AND sender_id = ?);
        `;
        const [requestResult] = await db.query(requestQuery, [user_id, friend_id, user_id, friend_id]);

        if (requestResult.length > 0) {
            const request = requestResult[0];
            if (request.sender_id === user_id) {
                return res.status(200).json({ status: "pending", role: "sender" });
            } else {
                return res.status(200).json({ status: "pending", role: "receiver" });
            }
        }

        return res.status(200).json({ status: "not_friends" });

    } catch (error) {
        console.error("Error getting friend status:", error);
        return res.status(500).json({ error: error.message });
    }
};

// exports.getFriendsRequest = async (req, res) => {
//     const { user_id } = req.query;
//     try {
//         const query = `
//             SELECT up.*
//             FROM FriendshipRequests frq 
//             JOIN UserProfiles up ON up.user_id = frq.sender_id
//             WHERE frq.receiver_id = ? AND frq.status = 'pending'
//         `;
//         const [requests] = await db.query(query, [user_id]); 
//         return res.status(200).json(requests);
//     } catch (error) {
//         return res.status(500).json({ error: error.message });
//     }
// };
exports.getFriendsRequest = async (req, res) => {
    const user_id = req.user.user_id; // Lấy user_id từ token đã xác thực
    const {  page = 1, pageSize = 10 } = req.query; 

    try {
        const offset = (page - 1) * pageSize; 

        const [requests] = await db.query(`
            SELECT up.* 
            FROM FriendshipRequests frq
            JOIN UserProfiles up ON up.user_id = frq.sender_id
            WHERE frq.receiver_id = ? AND frq.status = 'pending'
            LIMIT ? OFFSET ?
        `, [user_id, parseInt(pageSize),parseInt( offset)]);

        const [[{ totalCount }]] = await db.query(`
            SELECT COUNT(*) AS totalCount
            FROM FriendshipRequests 
            WHERE receiver_id = ? AND status = 'pending'
        `, [user_id]);

        // Tính số trang
        const totalPages = Math.ceil(totalCount / pageSize);

        res.status(200).json({
            requests,
            pagination: {
                page,
                pageSize,
                totalPages,
                totalCount,
            },
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
};
exports.cancelFriendRequest = async (req, res) => {
    const { user_id } = req.user; // Lấy user_id từ token đã xác thực
    const {  friend_id } = req.body;

    try {
        const [result] = await db.query(
            "DELETE FROM FriendshipRequests WHERE sender_id = ? AND receiver_id = ? AND status = 'pending'",
            [user_id, friend_id]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({ message: "No pending friend request to cancel." });
        }

        res.status(200).json({ message: "Friend request cancelled successfully!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
