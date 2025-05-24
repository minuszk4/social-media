import React, { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { Home } from "lucide-react";
import "../assets/css/SearchPage.css";
import Post from "../assets/components/Post";
import Avatar from "../assets/components/Avatar";
import LeftSidebar from "../assets/components/LeftSidebar";
const SearchPage = () => {
  const location = useLocation();
  const storedUserId = localStorage.getItem("user_id") || "";
  const finalUserId = storedUserId;
  const urlQuery = new URLSearchParams(location.search).get("q") || "";
  const query = urlQuery;

  const [results, setResults] = useState({ posts: [], users: [] });
  const [activeTab, setActiveTab] = useState("posts");

  useEffect(() => {
    if (!finalUserId) {
      console.error("Lỗi: Không có user_id");
      return;
    }

    if (!query) {
      console.error("Lỗi: Không có query");
      return;
    }

    console.log("🔍 Gọi API với:", { query, finalUserId });

    const fetchData = async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/api/search?q=${query}&user_id=${finalUserId}`,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          }
        );
        if (!res.ok) throw new Error("Lỗi khi lấy dữ liệu");

        const data = await res.json();
        setResults({ posts: data.posts, users: data.users });
      } catch (error) {
        console.error("Lỗi khi lấy dữ liệu:", error);
      }
    };

    fetchData();
  }, [query, finalUserId]);

  return (
    <div className="search-page-container">
      <LeftSidebar />
    <div className="search-page">
      <h2>Kết quả tìm kiếm cho: "{query}"</h2>

      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === "posts" ? "active" : ""}`}
          onClick={() => setActiveTab("posts")}
        >
          Bài viết
        </button>
        <button
          className={`tab-button ${activeTab === "users" ? "active" : ""}`}
          onClick={() => setActiveTab("users")}
        >
          Người dùng
        </button>
      </div>

      <div className="tab-content">
        {activeTab === "posts" ? (
          <>
            <h3>Bài viết</h3>
            {results.posts.length > 0 ? (
              results.posts.map((post) => <Post key={post.id} post={post} />)
            ) : (
            <div className="no-post">
              <p>Không tìm thấy bài viết nào.</p>
            </div>
            )}
          </>
        ) : (
          <>
            <h3>Người dùng</h3>
            {results.users.length > 0 ? (
              <div className="user-list">
                {results.users.map((user) => (
                  <Avatar key={user.user_id} userId={user.user_id} />
                ))}
              </div>
            ) : (
              <div className="no-user">
                <p>Không tìm thấy người dùng nào.</p>
              </div>
            )}
          </>
        )}
      </div>

      <Link to="/home" className="back-home">
        <Home size={20} /> Quay lại trang chủ
      </Link>
    </div>
    </div>
  );
};

export default SearchPage;