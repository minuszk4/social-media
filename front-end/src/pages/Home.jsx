import React, { useEffect, useState, useRef, useCallback } from "react";
import { Search, MessageCircle, Bell, Camera } from "lucide-react";
import "../assets/css/Home.css";
import Messages from "../assets/components/Messages";
import { useNavigate } from "react-router-dom";
import SearchPage from "./Search";
import LeftSidebar from "../assets/components/LeftSidebar";
import { useAppContext } from "../context/AppContext";
import Post from "../assets/components/Post";
import Story from "../assets/components/Story";
import Avatar from "../assets/components/Avatar";
import NotificationPopup from "../assets/components/Noti";
import socket from '../assets/utils/socket'; 
import { handlePaste } from "../assets/utils/handle";
import { v4 as uuidv4 } from 'uuid';

const Faketagram = () => {
  const [posts, setPosts] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [text, setText] = useState("");
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaPreviews, setMediaPreviews] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [privacyLevel, setPrivacyLevel] = useState("public");
  const [isPosting, setIsPosting] = useState(false);
  const { message, setMessage } = useAppContext();
  const [notifications, setNotifications] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({}); // { [conversation_id]: count }
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef();
  const navigate = useNavigate();
  const user_id = localStorage.getItem("user_id");
  const token = localStorage.getItem("token");
  const [notificationPage, setNotificationPage] = useState(1);
  const [hasMoreNotifications, setHasMoreNotifications] = useState(true);
  const [error, setError] = useState("");
  const NOTIFICATIONS_LIMIT = 10;
  const MAX_MEDIA = 5;
  const MAX_FILE_SIZE = 5 * 1024 * 1024;

  useEffect(() => {
    const fetchUnreadCounts = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/conversations/unread", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Failed to fetch unread counts");
        const data = await response.json();
        console.log("Unread counts:", data[0].unread_count);
        setUnreadCounts(data[0].unread_count);
      } catch (error) {
        console.error("Error fetching unread counts:", error);
      }
    };
    fetchUnreadCounts();
  }, []);



  const handleSearch = (e) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery(""); 
    }
  };

  const fetchContacts = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/contacts', {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setContacts(data);
    } catch (error) {
      console.error("Error fetching contacts:", error);
    }
  };

  const fetchPosts = async (pageNum = 1) => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/posts?page=${pageNum}&limit=5`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!res.ok) throw new Error("Failed to fetch posts");
      const data = await res.json();

      if (data.length < 5) setHasMore(false);
      setPosts((prev) => {
        const existingPostIds = prev.map(post => post.post_id);
        const newPosts = data.filter(post => !existingPostIds.includes(post.post_id));
        return [...prev, ...newPosts];
      });
    } catch (error) {
      console.error("Error fetching posts:", error);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [user_id]);

  useEffect(() => {
    fetchPosts(page);
  }, [page]);

  const lastPostRef = useCallback(
    (node) => {
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prev) => prev + 1);
        }
      });
      if (node) observer.current.observe(node);
    },
    [hasMore]
  );

  const handlePost = (e) => {
    setText(e.target.value);
    e.target.style.height = "50px";
    e.target.style.height = e.target.scrollHeight + "px";
  };

  const handleSubmitPost = async () => {
    if (!text.trim() && mediaFiles.length === 0) {
      alert("Please enter content or select media!");
      return;
    }

    setIsPosting(true);
    const formData = new FormData();
    formData.append("text", text);
    formData.append("user_id", user_id);
    formData.append("privacy_level", privacyLevel);
    mediaFiles.forEach((file) => formData.append("media", file));

    try {
      const res = await fetch("http://localhost:5000/api/posts", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to post");

      alert("Post created successfully!");
      setText("");
      setMediaFiles([]);
      setMediaPreviews([]);
      setError("");
      fetchPosts(1);
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Failed to create post. Please try again!");
    } finally {
      setIsPosting(false);
    }
  };

  const fetchNotifications = async (pageToLoad = 1) => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/notifications/?page=${pageToLoad}&limit=${NOTIFICATIONS_LIMIT}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await res.json();

      if (data.notifications.length < NOTIFICATIONS_LIMIT) {
        setHasMoreNotifications(false);
      }

      if (pageToLoad === 1) {
        setNotifications(data.notifications.map(notification => ({
          ...notification,
          client_id: uuidv4()
        })));
      } else {
        setNotifications((prev) => [
          ...prev,
          ...data.notifications.map(notification => ({
            ...notification,
            client_id: uuidv4()
          }))
        ]);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user_id, token]);

  useEffect(() => {
    socket.on("notification", (notification) => {
      setNotifications((prev) => {
        const newNotification = { ...notification, client_id: uuidv4() };
        const isDuplicate = prev.some(
          (n) =>
            n.receiver_id === newNotification.receiver_id &&
            n.type === newNotification.type &&
            n.created_at === newNotification.created_at
        );
        if (isDuplicate) {
          return prev;
        }
        return [newNotification, ...prev];
      });
    });
    return () => {
      socket.off("notification");
    };
  }, []);

  useEffect(() => {
    console.log("Updated notifications:", notifications);
  }, [notifications]);

  const handleMediaChange = (e) => {
    const selected = Array.from(e.target.files);
    const total = selected.length + mediaFiles.length;

    if (total > MAX_MEDIA) {
      setError(`Bạn chỉ có thể đăng tối đa ${MAX_MEDIA} ảnh hoặc video.`);
      return;
    }

    for (const file of selected) {
      if (file.size > MAX_FILE_SIZE) {
        setError('Kích thước tệp tối đa là 5MB.');
        return;
      }
    }

    setMediaFiles((prev) => [...prev, ...selected]);
    setMediaPreviews((prev) => [
      ...prev,
      ...selected.map((file) => URL.createObjectURL(file)),
    ]);
    setError('');
  };

  const removeMedia = (index) => {
    const newFiles = [...mediaFiles];
    const newPreviews = [...mediaPreviews];
    newFiles.splice(index, 1);
    newPreviews.splice(index, 1);
    setMediaFiles(newFiles);
    setMediaPreviews(newPreviews);
    setError('');
  };

  return (
    <div className="home">
      <div className="top-bar">
        <div className="left-section">Faketagram</div>
        <div className="center-section">
          <div className="search-icon">
            <Search size={24} />
            <input
              type="text"
              placeholder="Search Here"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
            />
          </div>
        </div>
        <div className="right-section">
          <div className="message-icon-wrapper">

            <button className="icon-btn" onClick={() => setMessage((prev) => !prev)}>
              <div className="mess-icon-btn">
              <MessageCircle size={30} />
              {unreadCounts > 0 && (
              <span class="badge"></span>
              )}
            </div>
            </button>

          </div>
          <div className="icon-btn">
            <NotificationPopup
              notifications={notifications}
              setNotifications={setNotifications}
              onLoadMore={() => {
                const nextPage = notificationPage + 1;
                fetchNotifications(nextPage);
                setNotificationPage(nextPage);
              }}
              hasMore={hasMoreNotifications}
            />
          </div>
          <div className="profile" onClick={() => navigate(`/profile/${user_id}`)}>
            <Avatar userId={user_id} />
          </div>
        </div>
      </div>

      <div className="container">
        <LeftSidebar />
        <div className="main-content">

              <Story userId={user_id} />
              <div className="post-section">
                <span>Create post</span>
                <textarea
                  placeholder="What's on your mind?"
                  rows="1"
                  value={text}
                  onChange={handlePost}
                  onPaste={(e) => handlePaste(e, setMediaPreviews, setMediaFiles)}
                  disabled={isPosting}
                />
                <div className="post-preview-home">
                  {mediaPreviews.length > 0 && (
                    <div className="media-preview-container">
                      {mediaPreviews.map((preview, index) => (
                        <div key={index} className="media-preview-hm">
                          {mediaFiles[index].type.startsWith("image") ? (
                            <img
                              src={preview}
                              alt={`Preview ${index}`}
                              className={isPosting ? "uploading" : ""}
                            />
                          ) : (
                            <video
                              src={preview}
                              controls
                              className={isPosting ? "uploading" : ""}
                            />
                          )}
                          <button
                            className="remove-media-btn"
                            onClick={() => removeMedia(index)}
                            disabled={isPosting}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {isPosting && (
                        <div className="loading-overlay">
                          <div className="spinner"></div>
                        </div>
                      )}
                    </div>
                  )}
                  {error && <p className="error-message">{error}</p>}
                </div>

                <div className="post-button-mg">
                  <button
                    className="camera-btn"
                    onClick={() => document.getElementById("file-input").click()}
                    disabled={isPosting}
                  >
                    <Camera size={24} />
                  </button>
                  <input
                    type="file"
                    id="file-input"
                    accept="image/*,video/*"
                    multiple
                    style={{ display: "none" }}
                    onChange={handleMediaChange}
                    disabled={isPosting}
                  />
                  <div className="privacy-level">
                    <label>Privacy Level:</label>
                    <select
                      value={privacyLevel}
                      onChange={(e) => setPrivacyLevel(e.target.value)}
                      disabled={isPosting}
                    >
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                      <option value="friends">Friends</option>
                    </select>
                  </div>
                  <div className="cancel-submit-hm">
                    <button
                      className="cancel-btn"
                      onClick={() => {
                        setText("");
                        setMediaFiles([]);
                        setMediaPreviews([]);
                        setError("");
                      }}
                      disabled={isPosting}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmitPost}
                      disabled={isPosting}
                    >
                      {isPosting ? "Đang đăng..." : "Post"}
                    </button>
                  </div>
                </div>
              </div>

              {posts.map((post, index) => {
                if (index === posts.length - 1) {
                  return (
                    <div ref={lastPostRef} key={post.post_id}>
                      <Post post={post} />
                    </div>
                  );
                } else {
                  return <Post key={post.post_id} post={post} />;
                }
              })}
              {!hasMore && <p style={{ textAlign: "center" }}>No more posts</p>}
          
        </div>

        <div className="contacts-section">
          <h3>Contacts</h3>
          <div className="contacts">
            {contacts.length > 0 ? (
              contacts.map((contact, index) => (
                <div key={index} className="contact">
                  <Avatar
                    userId={contact.user_id}
                    onProfile={(id) => navigate(`/profile/${id}`)}
                  />
                </div>
              ))
            ) : (
              <p>No contacts available</p>
            )}
          </div>
        </div>
      </div>

      {message && (
        <Messages
          contacts={contacts}
          conversations={[]}
          currentUser={{ user_id }}
          onClose={() => setMessage(false)}
          unreadCounts={unreadCounts}
          setUnreadCounts={setUnreadCounts}
        />
      )}
    </div>
  );
};

export default Faketagram;