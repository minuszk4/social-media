import { useParams, useNavigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import "../assets/css/PostPage.css";
import Post from '../assets/components/Post';
import LeftSidebar from "../assets/components/LeftSidebar";
const PostPage = () => {
    const { post_id } = useParams();  // Lấy post_id từ URL
    const [post, setPost] = useState(null);  // State để lưu bài viết
    // console.log(post_id);
    const fetchPost = async (post_id) => {
        try {
            const response = await fetch(`http://localhost:5000/api/posts/${post_id}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });

            if (!response.ok) {
                throw new Error('Không thể lấy dữ liệu bài viết');
            }

            const data = await response.json();
            console.log(data);
            return data;
        } catch (error) {
            console.error('Lỗi khi fetch bài viết:', error);
            return null;
        }
    };

    useEffect(() => {
        const getPost = async () => {
            const data = await fetchPost(post_id);
            setPost(data);  
        };

        if (post_id) {
            getPost();
        }
    }, [post_id]); 

    if (!post) {
        return <div>Đang tải...</div>;
    }

    return (
        <div className="post-page">
            <LeftSidebar />
            <Post post={post} />
        </div>
    );
    
};

export default PostPage;
