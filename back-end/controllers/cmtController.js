const db = require("../models/db")
const { v4: uuidv4 } = require('uuid');

exports.getCMTbyPostId = async (req, res) => {
    const postId = req.params.postId;

    try {
        const query = `
            SELECT c.*, u.username, up.full_name, up.avatar_url 
            FROM Comments c
            JOIN Users u ON c.user_id = u.user_id
            LEFT JOIN UserProfiles up ON c.user_id = up.user_id
            WHERE c.post_id = ? AND c.parent_comment_id IS NULL
            ORDER BY c.created_at DESC
        `;

        const [comments] = await db.execute(query, [postId]);

        if (!comments || comments.length === 0) {
            return res.status(200).json({ success: true, comments: [] });
        }

        const commentsWithReplies = await Promise.all(comments.map(async (comment) => {
            const repliesQuery = `
                SELECT c.*, u.username, up.full_name, up.avatar_url 
                FROM Comments c
                JOIN Users u ON c.user_id = u.user_id
                LEFT JOIN UserProfiles up ON c.user_id = up.user_id
                WHERE c.parent_comment_id = ?
                ORDER BY c.created_at ASC
            `;

            const [replies] = await db.execute(repliesQuery, [comment.comment_id]);

            return {
                ...comment,
                replies: replies || [] 
            };
        }));

        return res.status(200).json({ 
            success: true, 
            comments: commentsWithReplies 
        });

    } catch (error) {
        console.error("Lỗi khi lấy comments:", error);
        return res.status(500).json({ success: false, message: "Lỗi server khi lấy comments" });
    }
};
exports.createCMT = async (req, res) => {
    const { post_id, user_id, content, parent_comment_id } = req.body;
    console.log(user_id);

    if (!post_id || !user_id || !content) {
        return res.status(400).json({ 
            success: false, 
            message: "Thiếu thông tin bắt buộc (post_id, user_id, content)" 
        });
    }
    
    try {
        const comment_id = uuidv4();
        
        // Sử dụng async/await thay vì callback
        const query = `
            INSERT INTO Comments (comment_id, post_id, user_id, content, parent_comment_id) 
            VALUES (?, ?, ?, ?, ?)
        `;
        
        await db.query(query, [comment_id, post_id, user_id, content, parent_comment_id || null]);

        // Lấy thông tin comment mới
        const getCommentQuery = `
            SELECT c.*, u.username, up.full_name, up.avatar_url 
            FROM Comments c
            JOIN Users u ON c.user_id = u.user_id
            LEFT JOIN UserProfiles up ON c.user_id = up.user_id
            WHERE c.comment_id = ?
        `;
        const [comments] = await db.query(getCommentQuery, [comment_id]);



        return res.status(201).json({ 
            success: true, 
            message: "Comment đã được tạo thành công",
            comment: comments[0]
        });
        
    } catch (error) {
        console.error("Lỗi khi tạo comment:", error);
        return res.status(500).json({ success: false, message: "Lỗi server" });
    }
};

exports.deleteComment = async (req, res) => {
    const commentId = req.params.commentId;
    const { user_id } = req.user; 
    try {
        const checkOwnerQuery = `SELECT user_id FROM Comments WHERE comment_id = ?`;
        
        const [results] = await db.query(checkOwnerQuery, [commentId]);

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: "Comment không tồn tại" });
        }
        if (results[0].user_id !== user_id && req.user.isAdmin===false ) {
            // Nếu người dùng không phải là người tạo comment và không phải là admin
            return res.status(403).json({ success: false, message: "Bạn không có quyền xóa comment này" });
        }

        const deleteQuery = `DELETE FROM Comments WHERE comment_id = ?`;
        await db.query(deleteQuery, [commentId]);

        return res.status(200).json({
            success: true,
            message: "Comment đã được xóa thành công"
        });

    } catch (error) {
        console.error("Lỗi khi xóa comment:", error);
        return res.status(500).json({ success: false, message: "Lỗi server" });
    }
};


exports.getRepliesByCommentId= async (req, res) => {
    const commentId = req.params.commentId;
    
    try {
        const query = `
            SELECT c.*, u.username, up.full_name, up.avatar_url 
            FROM Comments c
            JOIN Users u ON c.user_id = u.user_id
            LEFT JOIN UserProfiles up ON c.user_id = up.user_id
            WHERE c.parent_comment_id = ?
            ORDER BY c.created_at ASC
        `;
        
        db.query(query, [commentId], (err, replies) => {
            if (err) {
                console.error("Lỗi khi lấy replies:", err);
                return res.status(500).json({ success: false, message: "Lỗi server khi lấy replies" });
            }
            
            return res.status(200).json({ 
                success: true, 
                replies
            });
        });
    } catch (error) {
        console.error("Lỗi khi lấy replies:", error);
        return res.status(500).json({ success: false, message: "Lỗi server" });
    }
};