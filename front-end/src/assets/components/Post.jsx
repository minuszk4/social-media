import { useState, useEffect } from "react";
import { FaRegHeart, FaRegComment, FaThumbsUp, FaHeart, FaLaugh, FaSurprise, FaSadTear, FaAngry, FaTimes } from "react-icons/fa";
import "../css/Post.css";
import Avatar from "./Avatar";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client"; 
import { useRef } from "react";
import EditPost from './EditPost';
import { toast } from 'react-toastify';
import { FaEllipsisH } from "react-icons/fa";
const socket = io("http://localhost:5000");
import useClickOutside from "../utils/click-out";
import { handlePaste,handlePasteTextOnly } from "../utils/handle";
// Component Post.js là một phần của ứng dụng mạng xã hội, hiển thị thông tin về bài viết, bao gồm nội dung, 
// phương tiện (hình ảnh/video), các cảm xúc (like, love, haha, wow, sad, angry), và bình luận của người dùng.
const reactions = [
    { type: "like", icon: <FaThumbsUp className="reaction-icon like" />, color: "#1877f2" },
    { type: "love", icon: <FaHeart className="reaction-icon love" />, color: "#f25268" },
    { type: "haha", icon: <FaLaugh className="reaction-icon haha" />, color: "#f7b125" },
    { type: "wow", icon: <FaSurprise className="reaction-icon wow" />, color: "#f7b125" },
    { type: "sad", icon: <FaSadTear className="reaction-icon sad" />, color: "#f7b125" },
    { type: "angry", icon: <FaAngry className="reaction-icon angry" />, color: "#e9710f" }
];

const Post = ({ post }) => {
    const user_id = localStorage.getItem("user_id");
    const token = localStorage.getItem("token");
    const navigate = useNavigate();
    if (!post || !post.post_id) {
        return <p className="error-message">Lỗi: Không có dữ liệu bài viết</p>;
    }
    console.log(post);
    const [selectedReaction, setSelectedReaction] = useState(null);
    const [showReactions, setShowReactions] = useState(false);
    const [reactionCounts, setReactionCounts] = useState({});
    const [showReactionPopup, setShowReactionPopup] = useState(false);
    const [reactionList, setReactionList] = useState([]);
    const [showCommentPopup, setShowCommentPopup] = useState(false);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
    const [showOptions, setShowOptions] = useState(false);
    const [isEditing,setIsEditing] = useState(false);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [postState, setPost] = useState(post); 
    const [showOptionsId, setShowOptionsId] = useState(null);
    const optionsRef = useClickOutside(() => setShowOptionsId(null)); 
    const [isShareVisible, setIsShareVisible] = useState(false);  // state để điều khiển hiển thị ô share
    const [url, setUrl] = useState('');
    const [isAdmin, setIsAdmin] = useState(null);
    const [isContentExpanded, setIsContentExpanded] = useState(false);
    const CONTENT_LIMIT = 200;

    const toggleOptions = (commentId) => {
        setShowOptionsId((prev) => (prev === commentId ? null : commentId));
    };
    useEffect(() => {
    const checkAdmin = async () => {
        if (window.location.pathname.startsWith('/admin')) {
        try {
            const res = await fetch('http://localhost:5000/api/admin/check', {
            headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Unauthorized');
            const data = await res.json();
            setIsAdmin(data.isAdmin === true);
        } catch {
            setIsAdmin(false);
        }
        } else {
        setIsAdmin(false); // Không phải site admin, không gọi API
        }
    };
    checkAdmin();
    }, [token]);
    useEffect(() => {
        setPost(post);
    }, [post]);
    const menuRef = useClickOutside(() => setShowOptions(null)); 
    const handleShareClick = () => {
        setUrl(`${window.location.origin}/post/${post.post_id}`);  // Đặt URL bài viết vào state
        setIsShareVisible(true);  // Hiển thị ô chứa URL
    };
    const handleCopyClick = () => {
        navigator.clipboard.writeText(url).then(() => {
            alert('URL đã được sao chép vào clipboard!');
        });
    };
    const handleCancelClick = () => {
        setIsShareVisible(false);  // Ẩn ô chia sẻ
    };

    useEffect(() => {
        const fetchReactions = async () => {
            try {
                const response = await fetch(`http://localhost:5000/api/postReactions/reactions/post/${post.post_id}`,{
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                });
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Failed to fetch reactions: ${response.status} - ${errorText}`);
                }
                const data = await response.json();
                const counts = data.reactions.reduce((acc, { reaction_type }) => {
                    acc[reaction_type] = (acc[reaction_type] || 0) + 1;
                    return acc;
                }, {});
                setReactionCounts(counts);
                setReactionList(data.reactions);
                const userReaction = data.reactions.find(r => r.user_id === user_id);
                setSelectedReaction(userReaction ? reactions.find(r => r.type === userReaction.reaction_type) : null);
            } catch (error) {
                console.error("Error fetching reactions:", error.message);
            }
        };
        fetchReactions();
    }, [post.post_id, user_id]);

    useEffect(() => {
        if (showCommentPopup) {
            fetchComments();
        }
    }, [showCommentPopup]);
    const handleDeleteComment = async (commentId) => {
        try {
            const response = await fetch(`http://localhost:5000/api/comments/${commentId}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization:`Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({ user_id: user_id}),
            });
    
            const data = await response.json();
            if (data.success) {
                setComments((prev) => prev.filter((cmt) => cmt.comment_id !== commentId));
            } else {
                alert(data.message || "Xoá comment thất bại");
            }
        } catch (error) {
            console.error("Lỗi khi xoá comment:", error);
            alert("Lỗi server khi xoá comment");
        }
    };
    
    const handleDelete = async () => {
        setShowDeleteConfirmation(false); 

        try {
            const res = await fetch(`http://localhost:5000/api/posts/${post.post_id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
            });

            const data = await res.json();
            if (res.ok && data.success) {
                toast.success("Xoá bài viết thành công!");
                if (onPostDelete) {
                    onPostDelete(post.post_id); // Gửi về parent nếu có
                }
            } else {
                toast.error(data.message || "Xoá bài viết thất bại.");
            }
        } catch (error) {
            console.error("Lỗi xoá bài viết:", error);
            toast.error("Không thể xoá bài viết.");
        }
    };

    const fetchComments = async () => {
        try {
            const response = await fetch(`http://localhost:5000/api/comments/post/${post.post_id}`,{
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to fetch comments: ${response.status} - ${errorText}`);
            }
            const data = await response.json();
            console.log(data);
            setComments(data.comments || []);
        } catch (error) {
            console.error("Error fetching comments:", error.message);
        }
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        let cleanedCmt = newComment.replace(/\n+$/,'').trim()
        setNewComment(cleanedCmt);
        const tempComment = {
            comment_id: Date.now(),
            user_id: user_id,
            full_name: "Bạn",
            content: newComment,
            avatar_url: "https://i.pinimg.com/originals/f1/0f/f7/f10ff70a7155e5ab666bcdd1b45b726d.jpg",
        };

        setComments((prev) => [...prev, tempComment]);
        setNewComment("");

        try {
            const response = await fetch("http://localhost:5000/api/comments", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
                body: JSON.stringify({
                    post_id: post.post_id,
                    user_id: user_id,
                    content: newComment,
                }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to add comment: ${response.status} - ${errorText}`);
            }
            await fetchComments();
            if (user_id !== post.user_id) {
                console.log(user_id, post.user_id, post.post_id);

                    await fetch("http://localhost:5000/api/notifications/create", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${localStorage.getItem("token")}`,
                        },
                        body: JSON.stringify({
                            user_id: user_id,
                            receiver_id: post.user_id,
                            type: "comment",
                            target_id: post.post_id,
                            target_type: "post",
                            content: `đã bình luận vào bài viết của bạn.`,
                        }),
                    });
                    
                    socket.emit("sendNotification", {
                        receiver_id: post.user_id,
                        notification: {
                            sender_id: user_id,
                            receiver_id: post.user_id,
                            type: "comment",
                            target_id: post.post_id,
                            target_type: "post",
                            content: `đã bình luận vào bài viết của bạn.`,
                            is_read: 0,
                        }
                    });     
                                      
            }


        } catch (error) {
            console.error("Error adding comment:", error.message);
            setComments((prev) => prev.filter((c) => c.comment_id !== tempComment.comment_id));
        }
    };

    const handleReaction = async (reaction) => {
        const newReaction = selectedReaction?.type === reaction.type ? null : reaction;
        setSelectedReaction(newReaction);
        setTimeout(() => setShowReactions(false), 200);

        try {
            const response = await fetch("http://localhost:5000/api/postReactions", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
                body: JSON.stringify({
                    target_id: post.post_id,
                    target_type: "post",
                    user_id: user_id,
                    reaction_type: newReaction ? newReaction.type : "remove",
                }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to update reaction: ${response.status} - ${errorText}`);
            }

            
            const data = await response.json();
            if (newReaction && user_id !== post.user_id) {
                // console.log(user_id, post.user_id, post.post_id);

                await fetch("http://localhost:5000/api/notifications/create", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                    body: JSON.stringify({
                        user_id: user_id,
                        receiver_id: post.user_id,
                        type: "like",
                        target_id: post.post_id,
                        target_type: "post",
                        content: `đã ${newReaction.type} bài viết của bạn.`,
                    }),
                });
                socket.emit("sendNotification", {
                    receiver_id:post.user_id,
                    notification: {
                        sender_id: user_id,
                        receiver_id: post.user_id,
                        type: "like",
                        target_id: post.post_id,
                        target_type: "post",
                        content: `đã ${newReaction.type} bài viết của bạn.`,
                        is_read: 0,
                    },
                });
                
                    
            }
            setReactionCounts((prev) => {
                const updated = { ...prev };
                if (selectedReaction) {
                    updated[selectedReaction.type] = Math.max((updated[selectedReaction.type] || 1) - 1, 0);
                }
                if (newReaction) {
                    updated[newReaction.type] = (updated[newReaction.type] || 0) + 1;
                }
                return updated;
            });
        } catch (error) {
            console.error("Error updating reaction:", error.message);
        }
    };
    const handleEdit= () => {
        setIsEditing(true);
    };

    const handleClose = () => {
        setIsEditing(false);
    };
    useEffect(() => {
        if (showCommentPopup) {
            document.body.style.overflow = 'hidden';
            fetchComments();
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [showCommentPopup]);
    const renderPostContent = () => {
        if (!post.content) return <p className="post-text">" "</p>;

        const isLongContent = post.content.length > CONTENT_LIMIT;
        const displayContent = isContentExpanded || !isLongContent
        ? post.content
        : post.content.slice(0, CONTENT_LIMIT);

        return (
        <p className="post-text">
            {displayContent}
            {isLongContent && !isContentExpanded && (
            <>
                ...{' '}
                <span
                className="see-more-link"
                onClick={() => setIsContentExpanded(true)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') setIsContentExpanded(true); }}
                >
                Xem thêm
                </span>
            </>
            )}
            {isLongContent && isContentExpanded && (
            <span
                className="see-more-link"
                onClick={() => setIsContentExpanded(false)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') setIsContentExpanded(false); }}
            >
                {' '}Thu gọn
            </span>
            )}
        </p>
        );
    };



    const hasMedia = Array.isArray(post.media) && post.media.length > 0;

    const renderMedia = (media, className) => {
        const currentMedia = media[currentMediaIndex];
        if (!currentMedia) return null;

        return (
            <div className="media-item" onClick={(e) => { e.stopPropagation(); setShowCommentPopup(true); }}>
                {currentMedia.media_type === "image" ? (
                    <img
                        src={currentMedia.media_url}
                        alt={`Media ${currentMedia.media_id}`}
                        className={className}
                        onClick={() => setShowCommentPopup(true)}
                        onError={(e) => (e.target.src = "/default-image.png")}
                    />
                ) : (
                    <video
                        src={currentMedia.media_url}
                        className={className}
                        controls
                        onClick={() => setShowCommentPopup(true)} 
                        onError={(e) => console.error("Video error:", e)}
                    />
                )}
                {media.length > 1 && (
                    <div className="media-controls" onClick={(e) => e.stopPropagation()}>
                        <button
                            className="media-nav-btn prev"
                            onClick={() => setCurrentMediaIndex((prev) => (prev > 0 ? prev - 1 : media.length - 1))}
                        >
                            &lt;
                        </button>
                        <span>{currentMediaIndex + 1} / {media.length}</span>
                        <button
                            className="media-nav-btn next"
                            onClick={() => setCurrentMediaIndex((prev) => (prev < media.length - 1 ? prev + 1 : 0))}
                        >
                            &gt;
                        </button>
                    </div>
                )}
            </div>
        );
    };
    return (
        <div className="post-container">
            <div className="post-header">
                <div className="post-name-time">
                    <Avatar
                        userId={post.user_id}
                        onMessage={(id) => navigate(`/messages/${id}`)}
                        onProfile={(id) => navigate(`/profile/${id}`)}
                    />
                    <p className="post-time">
                        {new Date(post.created_at).toLocaleString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                        })}
                    </p>
                </div>
                {user_id == post.user_id &&(
                    <div className="post-options" ref={menuRef}>
                        <button className="options-btn" onClick={() => setShowOptions(!showOptions)}>⋯</button>
                        {showOptions && (
                            <div className="options-menu">
                            <button onClick={() => handleEdit()}>edit</button>
                            <button onClick={() => handleDelete(post.post_id)}>delete</button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {renderPostContent()}
            {hasMedia && (
                <div className="post-media">{renderMedia(post.media, "post-image")}</div>
            )}

            <div className="post-actions">
                <div className="like-container">
                    <p className="like-count" onClick={() => setShowReactionPopup(true)}>
                        {Object.values(reactionCounts).reduce((a, b) => a + b, 0)} người đã thả cảm xúc
                    </p>
                    <div
                        className="like-button-container"
                        onMouseEnter={() => setShowReactions(true)}
                        onMouseLeave={() => setTimeout(() => setShowReactions(false), 500)}
                    >
                        {showReactions && (
                            <div className="reaction-popup">
                                {reactions.map((reaction) => (
                                    <div
                                        key={reaction.type}
                                        className="reaction-item"
                                        onClick={() => handleReaction(reaction)}
                                        style={{ color: reaction.color }}
                                    >
                                        {reaction.icon}
                                    </div>
                                ))}
                            </div>
                        )}
                        <button className="action-btn" style={{ color: selectedReaction ? selectedReaction.color : "inherit" }}>
                            {selectedReaction ? selectedReaction.icon : <FaRegHeart />}
                            {selectedReaction ? selectedReaction.type.toUpperCase() : "Thích"}
                        </button>

                    </div>
                </div>
                <button className="action-btn" onClick={() => setShowCommentPopup(true)}>
                    <FaRegComment /> Bình luận
                </button>
                <button className="action-btn" onClick={handleShareClick}>Share</button>

            </div>

            {showReactionPopup && (
                <div className="reaction-modal">
                    <div className="modal-content">
                        <h3>Chi tiết cảm xúc</h3>
                        {reactions.map(({ type, icon,color }) => (
                            <div key={type}>
                                <span style={{ color }}>{icon}</span> {reactionCounts[type] || 0}
                            </div>
                        ))}
                        <button onClick={() => setShowReactionPopup(false)}>Đóng</button>
                    </div>
                </div>
            )}

            {showCommentPopup && (
                <div className="comment-modal">
                    <div className={`cmt-content ${hasMedia ? "with-image" : "no-image"}`}>
                        <div className="cmt-header">
                            <h3>Post</h3>
                            <button className="close-button" onClick={() => setShowCommentPopup(false)}>
                                <FaTimes />
                            </button>
                        </div>
                        <div className="cmt-body">
                            {hasMedia && <div className="comment-modal-image">{renderMedia(post.media, "modal-post-image")}</div>}
                            <div className="cmt-section">
                                <div className="post-info">
                                    <div className="post-author">
                                        <Avatar
                                            userId={post.user_id}
                                            onMessage={(id) => navigate(`/messages/${id}`)}
                                            onProfile={(id) => navigate(`/profile/${id}`)}
                                            
                                        />
                                    </div>
                                {renderPostContent()}
                                </div>
                                <div className="comments-section">
                                    <h4 className="comments-title">Bình luận</h4>
                                    {comments.length > 0 ? (
                                        comments.map((comment) => (
                                            <div key={comment.comment_id} className="comment-item">
                                                <div className="comment-content">
                                                <div className="comment-left">

                                                    <Avatar
                                                        userId={comment.user_id}
                                                        onMessage={(id) => navigate(`/messages/${id}`)}
                                                        onProfile={(id) => navigate(`/profile/${id}`)}
                                                    />
                                                    <div className="comment-text-container">
                                                        <p className="comment-text">{comment.content}</p>

                                                        {(comment.user_id === user_id ||post.user_id === user_id || isAdmin) && (
                                                        <div className="comment-options">
                                                            <button
                                                                className="options-button"
                                                                onClick={() => toggleOptions(comment.comment_id)}
                                                            >
                                                                <FaEllipsisH />
                                                            </button>
                                                            {showOptionsId === comment.comment_id && (
                                                                <div className="options-menu" ref ={optionsRef}>
                                                                    <button onClick={() => handleDeleteComment(comment.comment_id)}>
                                                                        Xóa bình luận
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                        )}
                                                    </div>
                                                    
                                                </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="no-comments">Chưa có bình luận nào</p>
                                    )}
                                </div>
                                <form className="add-comment-form" onSubmit={handleAddComment}>
                                    <Avatar
                                        userId={user_id}
                                        showName={false} // Ẩn tên người dùng trong ô nhập bình luận
                                    />
                                    <textarea
                                        type="text"
                                        placeholder="Thêm bình luận..."
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        className="comment-input"
                                        onPaste={(e)=>handlePasteTextOnly(e,setNewComment)}
                                    />
                                    <button type="submit" className="submit-comment">Gửi</button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {showDeleteConfirmation && (
                <div className="confirmation-modal">
                    <div className="modal-content">
                        <h3>Bạn có chắc chắn muốn xóa bài viết này không?</h3>
                        <button onClick={handleDeletePost}>Xóa</button>
                        <button onClick={() => setShowDeleteConfirmation(false)}>Hủy</button>
                    </div>
                </div>
            )}
            {isEditing && (
                <EditPost
                postData={post}
                onCancel={() => setIsEditing(false)}
                onSuccess={(updatedPost) => {
                    setPost(updatedPost);
                    setIsEditing(false);
                }}
                />
            )}
            {isShareVisible && (
                    <div className="share-container">
                        <input 
                            type="text" 
                            value={url} 
                            readOnly 
                            className="share-url"
                        />
                        <button onClick={handleCopyClick}>Copy URL</button>
                        <button onClick={handleCancelClick} className="share-cancel-btn">Cancel</button>

                </div>
            )}
        </div>
    );
};

export default Post;