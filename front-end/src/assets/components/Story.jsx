import React, { useEffect, useState, useRef } from "react";
import "../css/Story.css";
import { FaPlus } from "react-icons/fa";
import Slider from "react-slick";
import Modal from "react-modal";
import Avatar from "./Avatar";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const CustomPrevArrow = ({ onClick }) => (
  <button className="custom-prev" onClick={onClick}>
    <FaChevronLeft />
  </button>
);

const CustomNextArrow = ({ onClick }) => (
  <button className="custom-next" onClick={onClick}>
    <FaChevronRight />
  </button>
);

const sliderSettings = {
  dots: false,
  infinite: false,
  speed: 500,
  slidesToShow: 6,
  slidesToScroll: 1,
  arrows: true,
  prevArrow: <CustomPrevArrow />,
  nextArrow: <CustomNextArrow />,
};

Modal.setAppElement("#root");

const Story = ({ userId }) => {
  const [stories, setStories] = useState([]);
  const [showStoryForm, setShowStoryForm] = useState(false);
  const [storyImage, setStoryImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [groupedStories, setGroupedStories] = useState({});
  const [isUploading, setIsUploading] = useState(false);

  const BASE_URL = "http://localhost:5000";
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/stories/${userId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (!res.ok) throw new Error("Lỗi khi lấy stories");
        const data = await res.json();
        setStories(data);
        const grouped = data.reduce((acc, story) => {
          if (!acc[story.user_id]) acc[story.user_id] = [];
          acc[story.user_id].push(story);
          return acc;
        }, {});
        setGroupedStories(grouped);
      } catch (error) {
        console.error("Lỗi khi lấy stories:", error);
      }
    };

    fetchStories();
  }, [userId]);

  const handleStoryImageChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      setStoryImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setShowStoryForm(true);
    } else if (file) {
      alert("Vui lòng chọn một file hình ảnh hợp lệ!");
    }
  };

  const handleSubmitStory = async () => {
    if (!storyImage) {
      alert("Vui lòng chọn hình ảnh cho story!");
      return;
    }
    setIsUploading(true);

    const formData = new FormData();
    formData.append("user_id", userId);
    formData.append("media", storyImage);

    try {
      const res = await fetch(`${BASE_URL}/api/stories`, {
        method: "POST",
        body: formData,
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (!res.ok) {
        throw new Error("Lỗi khi tạo story");
      }

      const updatedStories = await (
        await fetch(`${BASE_URL}/api/stories/${userId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
      ).json();
      setStories(updatedStories);
      setStoryImage(null);
      setPreviewUrl(null);
      setShowStoryForm(false);
    } catch (error) {
      alert("Tạo story thất bại!");
    } finally {
      setIsUploading(false);
    }
  };

  const handleStoryClick = (user_id, storyId) => {
    navigate(`/stories/${user_id}/${storyId}`);
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="stories-section">
      <div className="stories-header">
        <h3>📖 Stories</h3>
        {/* <div className="create-story-btn" onClick={triggerFileInput}>
          <FaPlus className="create-story-icon" />
        </div> */}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden-file-input"
        accept="image/*"
        onChange={handleStoryImageChange}
      />

      {showStoryForm && previewUrl && (
        <div className="story-form">
          <div className="story-preview">
            <img
              src={previewUrl}
              alt="Story Preview"
              className={isUploading ? "uploading" : ""}
            />
            {isUploading && (
              <div className="loading-overlay">
                <div className="spinner"></div>
              </div>
            )}
            <button
              className="delete-btn"
              onClick={() => {
                setStoryImage(null);
                setPreviewUrl(null);
                setShowStoryForm(false);
              }}
              disabled={isUploading}
            >
              Xóa ảnh
            </button>
            <button
              className="submit-btn"
              onClick={handleSubmitStory}
              disabled={isUploading}
            >
              {isUploading ? "Đang đăng..." : "Đăng Story"}
            </button>
          </div>
        </div>
      )}

      <div className="story-container">
        <Slider {...sliderSettings}>
          <div className="story-item create-story" onClick={triggerFileInput}>
            <div className="story-avt-container">
              <FaPlus className="story-icon" />
            </div>
            <p className="story-name">Tạo tin</p>
          </div>

          {Object.keys(groupedStories).length > 0 ? (
            Object.entries(groupedStories).map(([user_id, userStories]) => (
              <div
                key={user_id}
                className="story-item"
                onClick={() => handleStoryClick(user_id, userStories[0].story_id)}
              >
                <div className="story-avt-container">
                  <img
                    src={userStories[0].media_url}
                    alt="Story"
                    className="story-avt"
                  />
                </div>
                <p className="story-name">{userStories[0].full_name}</p>
              </div>
            ))
          ) : (
            <div className="empty-story-item">
              <p>Không có story nào</p>
            </div>
          )}
        </Slider>
      </div>
    </div>
  );
};

export default Story;