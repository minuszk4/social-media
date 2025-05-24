import React, { useState, useEffect } from "react";
import { FaComment, FaUser } from "react-icons/fa";
import Messages from "./Messages";
import "../css/Avatar.css";
import { useNavigate } from "react-router-dom";

const Avatar = ({ userId, onProfile, showName = true, showImg = true,showPopup = true }) => {
  const myUserId = localStorage.getItem("user_id");
  const [data, setData] = useState(null);
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!userId) return;
      setIsLoading(true);
      try {
        const res = await fetch(`http://localhost:5000/api/profile/${userId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (!res.ok) throw new Error("Failed to fetch profile");
        const userData = await res.json();
        setData(userData);
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserInfo();
  }, [userId]);

  const handleOpenChat = (e) => {
    e.stopPropagation();
    e.preventDefault(); // Add preventDefault to avoid any default behavior
    setIsMessagesOpen(true);
    setIsPopupVisible(false); // Explicitly hide popup
  };

  const handleCloseMessages = () => {
    setIsMessagesOpen(false);
    setIsPopupVisible(false); // Ensure popup stays hidden after closing Messages
  };

  const handleNavigateToProfile = (e) => {
    e.stopPropagation();
    e.preventDefault(); // Add preventDefault for consistency
    navigate(`/profile/${userId}`);
    setIsPopupVisible(false); // Hide popup when navigating to profile
  };

  if (isLoading) return <div className="avatar-container">Loading...</div>;

  return (
    <div
      className="avatar-container"
      onMouseEnter={() => {
        if (!isMessagesOpen && !isPopupVisible) {
          setIsPopupVisible(true); // Only show popup if Messages is closed and popup is not already visible
        }
      }}
      onMouseLeave={() => {
        if (!isMessagesOpen) {
          setIsPopupVisible(false); // Only hide popup if Messages is closed
        }
      }}
    >
      {showImg && (
        <img
          src={
            data?.avatar_url
              ? data.avatar_url
              : "https://static.vecteezy.com/system/resources/previews/009/734/564/original/default-avatar-profile-icon-of-social-media-user-vector.jpg"
          }
          alt={data?.full_name || "User avatar"}
          className="avatar"
          onError={(e) =>
            (e.target.src =
              "https://static.vecteezy.com/system/resources/previews/009/734/564/original/default-avatar-profile-icon-of-social-media-user-vector.jpg")
          }
        />
      )}
      {showName && <span className="name">{data?.full_name || "Unknown User"}</span>}

      {(showPopup && isPopupVisible) && (
        <div className="avt-popup">
          {myUserId !== userId && (
            <>
              <button
                className="avt-popup-button"
                onClick={handleOpenChat}
                disabled={isMessagesOpen} // Disable button if Messages is open
              >
                <FaComment /> Message
              </button>
              <button className="avt-popup-button" onClick={handleNavigateToProfile}>
                <FaUser /> Profile
              </button>
            </>
          )}
          {myUserId === userId && (
            <button className="avt-popup-button" onClick={handleNavigateToProfile}>
              <FaUser /> Profile
            </button>
          )}
        </div>
      )}

      {isMessagesOpen && (
        <Messages
          contacts={[{ user_id: userId, full_name: data?.full_name }]}
          conversations={[]}
          currentUser={{ user_id: myUserId }}
          selectedConversation={{ user_id: userId, full_name: data?.full_name }}
          onClose={handleCloseMessages}
        />
      )}
    </div>
  );
};

export default Avatar;