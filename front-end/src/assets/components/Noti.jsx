import React, { useState, useEffect, memo, use } from "react";
import { Bell } from "lucide-react";
import "../css/NotiPopup.css";
import Avatar from "./Avatar";
import { useNavigate } from "react-router-dom";

const NotificationPopup = memo(({ notifications = [],setNotifications, onLoadMore, hasMore,onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();
  const [unreadNotifications, setUnreadNotifications] = useState(
    notifications.filter((notif) => !notif.is_read)
  );
  
  useEffect(() => {
    setUnreadNotifications(notifications.filter((notif) => !notif.is_read));
  }, [notifications]);
  const togglePopup = () => setIsVisible((prev) => !prev);

  const handleMarkAllAsRead = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/notifications/markAllRead', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem("token")}`, 
        },
      });
  
      if (!response.ok) {
        throw new Error('Failed to mark notifications as read');
      }
      setNotifications((prevNotifs) =>
        prevNotifs.map((notif) => ({ ...notif, is_read: 1 }))
      );
      console.log(notifications);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (event.target.closest(".notification-container") === null) {
        onClose?.();
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [onClose]);


  return (
    <div className="notification-container">
      <div
        className="noti-icon-btn"
        onClick={togglePopup}
        role="button"
        tabIndex={0}
        aria-label={`Bạn có ${unreadNotifications.length} thông báo mới`}
        onKeyDown={(e) => e.key === "Enter" && togglePopup()}
      >
        <Bell size={28} />
        {unreadNotifications.length > 0 && (
          <span className="badge"></span>
        )}
      </div>

      {isVisible && (
        <div className="notification-popup">
          <h4 className="notification-title">Thông báo</h4>
          {notifications.length > 0 ? (
            <>
              <button
                className="mark-all-btn"
                onClick={handleMarkAllAsRead}
              >
                Đánh dấu tất cả đã đọc
              </button>
              <ul className="notification-list">
                {notifications.map((notif, idx) => (
                  <li
                    key={notif.id || idx}
                    className={`notification-item ${notifications.includes(notif.id) ? "read" : ""}`}
                  >
                    <div className="notification-info">
                      <Avatar
                        userId={notif.user_id|| notif.sender_id}
                        onMessage={(id) => navigate(`/messages/${id}`)}
                        onProfile={(id) => navigate(`/profile/${id}`)}
                      />
                    </div>
                    <div className="notif-content">
                      {notif.content}
                    </div>
                </li>
                ))}
              </ul>
              {hasMore && (
                <button className="show-more-btn" onClick={onLoadMore}>
                  Xem thêm
                </button>
              )}
            </>
          ) : (
            <p className="no-notifications">Không có thông báo mới</p>
          )}
        </div>
      )}
    </div>
  );
});

export default NotificationPopup;
