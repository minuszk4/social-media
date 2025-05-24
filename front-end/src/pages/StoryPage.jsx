import React, { useEffect, useState, useMemo } from "react";
import "../assets/css/Stories.css";
import Avatar from "../assets/components/Avatar";
import { useNavigate, useParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faArrowRight,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";

const BASE_URL = "http://localhost:5000";

const Stories = () => {
  const [stories, setStories] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [views, setViews] = useState([]);
  const [showViewers, setShowViewers] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false); // New state for deletion loading
  const limit = 10;

  const userId = localStorage.getItem("user_id");
  const token = localStorage.getItem("token");
  const navigate = useNavigate();
  const { userId: paramUserId, storyId } = useParams();

  // Memoize grouped stories to prevent unnecessary recalculations
  const groupedStories = useMemo(() => {
    return stories.reduce((acc, story) => {
      if (!acc[story.user_id]) acc[story.user_id] = [];
      acc[story.user_id].push(story);
      return acc;
    }, {});
  }, [stories]);

  const toggleViewers = () => {
    setShowViewers((prev) => !prev);
  };

  // Fetch stories
  useEffect(() => {
    const fetchStories = async () => {
      setIsLoading(true);
      if (!userId || !token) {
        setError("Bạn phải đăng nhập để xem stories.");
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(
          `${BASE_URL}/api/stories/${userId}?limit=${limit}&page=${page}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (res.status === 401) {
          setError("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
          navigate("/login");
          return;
        }

        if (!res.ok) throw new Error("Không thể tải stories");
        const data = await res.json();
        setStories((prev) => [...prev, ...data]);
        setHasMore(data.length >= limit);
      } catch (error) {
        console.error("Lỗi khi tải stories:", error);
        setError("Không thể tải stories. Vui lòng thử lại sau.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStories();
  }, [userId, token, page, navigate]);

  // Record story view
  useEffect(() => {
    let isMounted = true;

    const recordView = async () => {
      if (
        selectedUserId &&
        groupedStories[selectedUserId]?.[currentIndex]?.story_id
      ) {
        const storyId = groupedStories[selectedUserId][currentIndex].story_id;

        try {
          const res = await fetch(`${BASE_URL}/api/stories/${storyId}/view`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });

          if (!res.ok && isMounted) {
            console.error("Lỗi khi ghi nhận lượt xem:", await res.text());
          }
        } catch (error) {
          if (isMounted) console.error("Lỗi khi ghi nhận lượt xem:", error);
        }
      }
    };

    recordView();

    return () => {
      isMounted = false;
    };
  }, [selectedUserId, currentIndex, groupedStories, token]);

  // Fetch story views
  useEffect(() => {
    let isMounted = true;

    const fetchViews = async () => {
      if (
        selectedUserId &&
        groupedStories[selectedUserId]?.[currentIndex]?.story_id
      ) {
        const storyId = groupedStories[selectedUserId][currentIndex].story_id;

        try {
          const res = await fetch(`${BASE_URL}/api/stories/getview/${storyId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (res.status === 401 && isMounted) {
            setError("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
            navigate("/login");
            return;
          }

          if (!res.ok) throw new Error("Không thể tải danh sách lượt xem");
          const data = await res.json();
          
          if (isMounted) setViews(data);
        } catch (error) {
          if (isMounted)
            console.error("Lỗi khi tải danh sách lượt xem:", error);
        }
      }
    };

    fetchViews();
    return () => {
      isMounted = false;
    };
  }, [selectedUserId, currentIndex, groupedStories, token, navigate]);

  // Set initial story based on URL params
  useEffect(() => {
    if (paramUserId && storyId && groupedStories[paramUserId]) {
      setSelectedUserId(paramUserId);
      const storyIndex = groupedStories[paramUserId].findIndex(
        (story) => story.story_id === storyId
      );
      setCurrentIndex(storyIndex >= 0 ? storyIndex : 0);
    }
  }, [paramUserId, storyId, groupedStories]);

  const handleUserClick = (userId) => {
    const firstStory = groupedStories[userId]?.[0];
    if (firstStory?.story_id) {
      setSelectedUserId(userId);
      setCurrentIndex(0);
      navigate(`/stories/${userId}/${firstStory.story_id}`);
    }
  };

  const handleNext = () => {
    if (!selectedUserId || !groupedStories[selectedUserId]) return;

    const userStories = groupedStories[selectedUserId];
    if (currentIndex < userStories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      navigate(
        `/stories/${selectedUserId}/${userStories[currentIndex + 1].story_id}`
      );
    } else {
      const keys = Object.keys(groupedStories);
      const currentIdx = keys.indexOf(selectedUserId);
      const nextUserId = keys[(currentIdx + 1) % keys.length];
      const nextUserStories = groupedStories[nextUserId];

      if (nextUserStories?.[0]?.story_id) {
        setSelectedUserId(nextUserId);
        setCurrentIndex(0);
        navigate(`/stories/${nextUserId}/${nextUserStories[0].story_id}`);
      }
    }
  };

  const handlePrev = () => {
    if (!selectedUserId || !groupedStories[selectedUserId]) return;

    const userStories = groupedStories[selectedUserId];
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      navigate(
        `/stories/${selectedUserId}/${userStories[currentIndex - 1].story_id}`
      );
    } else {
      const keys = Object.keys(groupedStories);
      const currentIdx = keys.indexOf(selectedUserId);
      const prevUserId = keys[(currentIdx - 1 + keys.length) % keys.length];
      const prevUserStories = groupedStories[prevUserId];
      const lastIndex = prevUserStories?.length - 1;

      if (prevUserStories?.[lastIndex]?.story_id) {
        setSelectedUserId(prevUserId);
        setCurrentIndex(lastIndex);
        navigate(`/stories/${prevUserId}/${prevUserStories[lastIndex].story_id}`);
      }
    }
  };

  const handleLoadMore = () => {
    setPage((prev) => prev + 1);
  };

  // New function to handle story deletion
  const handleDelete = async (storyId) => {
    if (isDeleting) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`${BASE_URL}/api/stories/${storyId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        setError("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
        navigate("/login");
        return;
      }

      if (!res.ok) throw new Error("Không thể xóa story");

      // Remove the deleted story from state
      setStories((prev) => prev.filter((story) => story.story_id !== storyId));

      // Handle navigation after deletion
      const userStories = groupedStories[selectedUserId] || [];
      const remainingStories = userStories.filter((story) => story.story_id !== storyId);

      if (remainingStories.length > 0) {
        // If there are remaining stories for the user
        const newIndex = currentIndex >= remainingStories.length ? remainingStories.length - 1 : currentIndex;
        setCurrentIndex(newIndex);
        navigate(`/stories/${selectedUserId}/${remainingStories[newIndex].story_id}`);
      } else {
        // If no stories remain for the user, go back to the stories list
        setSelectedUserId(null);
        setCurrentIndex(0);
        navigate("/stories");
      }
    } catch (error) {
      console.error("Lỗi khi xóa story:", error);
      setError("Không thể xóa story. Vui lòng thử lại sau.");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return "Không xác định";
      return date.toLocaleString("vi-VN", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      });
    } catch {
      return "Không xác định";
    }
  };

  if (isLoading && page === 1) {
    return (
      <div className="fb-wrapper">
        <div className="fb-content">
          <p>Đang tải stories...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fb-wrapper">
        <div className="fb-content no-stories">
          <h2>Lỗi</h2>
          <p>{error}</p>
          <button
            className="fb-close-btn"
            onClick={() => navigate("/home")}
            aria-label="Về trang chủ"
          >
            Về Trang Chủ
          </button>
        </div>
      </div>
    );
  }

  if (!stories.length && !Object.keys(groupedStories).length && !hasMore) {
    return (
      <div className="fb-wrapper">
        <div className="fb-content no-stories">
          <h2>Không Có Story</h2>
          <p>Hãy kiểm tra lại sau để xem story mới từ bạn bè!</p>
          <button
            className="fb-close-btn"
            onClick={() => navigate("/home")}
            aria-label="Về trang chủ"
          >
            Về Trang Chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fb-wrapper">
      <div className="fb-sidebar">
        <h2 className="fb-title">Stories</h2>
        {Object.entries(groupedStories).map(([userId, userStories]) => (
          <div
            key={userId}
            className={`fb-story-item ${
              userId === selectedUserId ? "active" : ""
            }`}
            onClick={() => handleUserClick(userId)}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => e.key === "Enter" && handleUserClick(userId)}
            aria-label={`Xem stories của người dùng ${userId}`}
          >
            <Avatar userId={userId} />
          </div>
        ))}
        {hasMore && (
          <button
            className="fb-load-more-btn"
            onClick={handleLoadMore}
            aria-label="Tải thêm stories"
          >
            Tải Thêm
          </button>
        )}
      </div>

      <div className="fb-content">
        {selectedUserId &&
        groupedStories[selectedUserId]?.[currentIndex] ? (
          <>
            <button
              onClick={handlePrev}
              className="fb-nav-btn"
              aria-label="Story trước"
              disabled={
                currentIndex === 0 &&
                Object.keys(groupedStories).indexOf(selectedUserId) === 0
              }
            >
              <FontAwesomeIcon icon={faArrowLeft} />
            </button>
            <div className="story-content-box">
              <div className="fb-header">
                <Avatar userId={selectedUserId} />
                <div className="fb-time">
                  {formatTimestamp(
                    groupedStories[selectedUserId][currentIndex].created_at
                  )}
                </div>
                <div className="fb-header-buttons">
                  {/* Delete button for user's own stories */}
                  {groupedStories[selectedUserId][currentIndex].user_id === userId && (
                    <button
                      className="fb-delete-btn"
                      onClick={() =>
                        handleDelete(
                          groupedStories[selectedUserId][currentIndex].story_id
                        )
                      }
                      aria-label="Xóa story"
                      disabled={isDeleting}
                    >
                      {isDeleting ? "Đang xóa..." : "🗑️"}
                    </button>
                  )}
                  <button
                    className="fb-close-btn"
                    onClick={() => navigate("/home")}
                    aria-label="Đóng story"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <img
                src={
                  groupedStories[selectedUserId][currentIndex].media_url ||
                  "placeholder-image.jpg"
                }
                alt={`Story của người dùng ${selectedUserId}`}
                className="fb-story-img"
              />
              {groupedStories[selectedUserId][currentIndex].text && (
                <div className="fb-text-box">
                  {groupedStories[selectedUserId][currentIndex].text}
                </div>
              )}
            </div>
            <button
              onClick={handleNext}
              className="fb-nav-btn"
              aria-label="Story tiếp theo"
              disabled={
                currentIndex ===
                  groupedStories[selectedUserId].length - 1 &&
                Object.keys(groupedStories).indexOf(selectedUserId) ===
                  Object.keys(groupedStories).length - 1
              }
            >
              <FontAwesomeIcon icon={faArrowRight} />
            </button>
            <button
              className="fb-viewers-btn"
              onClick={toggleViewers}
              aria-label="Xem danh sách người đã xem"
            >
              <FontAwesomeIcon icon={faUsers} /> Xem Người Đã Xem
            </button>
            {showViewers && (
              <div className="fb-viewers-list">
                <h3>Người Đã Xem</h3>
                <ul>
                  {views.length > 0 ? (
                    views.map((view) => (
                      <li key={view.user_id}>
                        <Avatar userId={view.user_id} showPopup={false} />
                      </li>
                    ))
                  ) : (
                    <li>Chưa có ai xem story này.</li>
                  )}
                </ul>
              </div>
            )}
          </>
        ) : (
          <div className="fb-content no-stories">
            <p>Chọn một story để xem nội dung.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Stories;