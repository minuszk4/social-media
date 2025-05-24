import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, X } from "lucide-react";
import { io } from "socket.io-client";
import Avatar from "./Avatar";
import "../css/PopupMessages.css";
import useClickOutside from "../utils/click-out";
import { handlePasteMess } from "../utils/handle";

const socket = io("http://localhost:5000");

const Messages = ({ contacts, conversations, currentUser, selectedConversation, onClose, unreadCounts, setUnreadCounts }) => {
    const [selectedChat, setSelectedChat] = useState(selectedConversation || null);
    const [messages, setMessages] = useState({});
    const [newMessage, setNewMessage] = useState("");
    const [showContacts, setShowContacts] = useState(!selectedConversation);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const popupRef = useClickOutside(() => setShowContacts(false));

    const chatBodyRef = useRef(null);
    const topMessageRef = useRef(null);
    const observer = useRef(null);
    const token = localStorage.getItem("token");
    useEffect(() => {
        if (selectedConversation) {
        openChat(selectedConversation);
        }
    }, [selectedConversation]);

    useEffect(() => {
        console.log("Messages updated:", messages);
    }, [messages]);

    useEffect(() => {
        socket.on("receiveMessage", (data) => {
        console.log("Received message:", data);
        setMessages((prev) => {
            const currentMessages = prev[data.conversation_id] || { messages: [], pagination: {} };
            const exists = currentMessages.messages.some(
                (msg) =>
                    msg.message_id === data.message_id ||
                    (msg.sender_id === data.sender_id &&
                        msg.message === data.message &&
                        msg.message_type === data.message_type &&
                        Math.abs(new Date(msg.timestamp) - new Date(data.timestamp)) < 1000)
            );
            if (exists) {
                console.log("Duplicate message ignored:", data);
                return prev;
            }
            if (!exists) {
            const updatedMessages = {
                ...prev,
                [data.conversation_id]: {
                ...currentMessages,
                messages: [{ ...data, is_read: false }, ...currentMessages.messages],
                },
            };
            if (selectedChat && selectedChat.conversation_id === data.conversation_id) {
                setTimeout(() => {
                chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
                }, 100);
                socket.emit("markAsRead", {
                conversation_id: data.conversation_id,
                user_id: currentUser.user_id,
                });
            } else if (data.sender_id !== currentUser.user_id) {
                setUnreadCounts((prev) => ({
                ...prev,
                [data.conversation_id]: (prev[data.conversation_id] || 0) + 1,
                }));
            }
            return updatedMessages;
            }
            return prev;
        });
        });

        socket.on("messageRead", ({ message_ids, user_id, conversation_id }) => {
        setMessages((prev) => {
            const updatedMessages = { ...prev };
            if (updatedMessages[conversation_id]) {
            updatedMessages[conversation_id].messages = updatedMessages[conversation_id].messages.map((msg) =>
                message_ids.includes(msg.message_id) ? { ...msg, is_read: true } : msg
            );
            }
            return updatedMessages;
        });
        setUnreadCounts((prev) => {
            const newCounts = { ...prev };
            newCounts[conversation_id] = Math.max(0, (newCounts[conversation_id] || 0) - message_ids.length);
            if (newCounts[conversation_id] === 0) delete newCounts[conversation_id];
            return newCounts;
        });
        });

        socket.on("error", ({ message }) => {
        console.error("Socket error:", message);
        alert(message);
        });

        return () => {
        socket.off("receiveMessage");
        socket.off("messageRead");
        socket.off("error");
        };
    }, [selectedChat, currentUser.user_id, setUnreadCounts]);

    const openChat = async (contact) => {
        let conversation = conversations.find((c) => c.user_id === contact.user_id);
        if (!conversation) {
        try {
            const response = await fetch("http://localhost:5000/api/conversations/create", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ user_id: currentUser.user_id, friend_id: contact.user_id }),
            });
            if (!response.ok) throw new Error("Failed to create conversation");
            conversation = await response.json();
        } catch (error) {
            console.error("Error creating conversation:", error);
            return;
        }
        }

        setSelectedChat(conversation);
        setShowContacts(false);

        setMessages((prev) => ({
        ...prev,
        [conversation.conversation_id]: { messages: [], pagination: {} },
        }));
        socket.emit("joinConversation", conversation.conversation_id);
        setPage(1);
        await fetchMessages(conversation.conversation_id, 1);
    };

    const fetchMessages = async (conversationId, pageNum) => {
        if (loading || !conversationId || pageNum < 1) return;
        setLoading(true);
        try {
        const response = await fetch(
            `http://localhost:5000/api/conversations/${conversationId}?page=${pageNum}&limit=10`,
            {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            }
        );
        if (!response.ok) throw new Error("Failed to fetch messages");
        const data = await response.json();

        setMessages((prev) => {
            const prevData = prev[conversationId] || { messages: [], pagination: {} };
            const newMessages = data.messages.filter(
            (msg) => !prevData.messages.some((existing) => existing.message_id === msg.message_id)
            );
            return {
            ...prev,
            [conversationId]: {
                messages: [...prevData.messages, ...newMessages],
                pagination: data.pagination,
            },
            };
        });

        socket.emit("markAsRead", {
            conversation_id: conversationId,
            user_id: currentUser.user_id,
        });
        } catch (error) {
        console.error("Error fetching messages:", error);
        } finally {
        setLoading(false);
        }
    };

    useEffect(() => {
        if (!selectedChat) return;
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver(
        (entries) => {
            if (entries[0].isIntersecting && !loading) {
            const nextPage = page + 1;
            const totalPages = messages[selectedChat.conversation_id]?.pagination?.totalPages || 1;
            if (nextPage <= totalPages) {
                setPage(nextPage);
                fetchMessages(selectedChat.conversation_id, nextPage);
            }
            }
        },
        {
            root: chatBodyRef.current,
            threshold: 1.0,
        }
        );

        const msgList = messages[selectedChat?.conversation_id]?.messages || [];
        if (msgList.length && topMessageRef.current && !loading) {
        observer.current.observe(topMessageRef.current);
        }

        return () => observer.current?.disconnect();
    }, [messages[selectedChat?.conversation_id]?.messages?.length, loading, selectedChat]);

    const sendMessage = async () => {
        if (!selectedChat || (!newMessage.trim() && !selectedImage)) return;

        const sendMessageData = async (message, message_type) => {
        const formData = new FormData();
        formData.append("conversation_id", selectedChat.conversation_id);
        formData.append("message_type", message_type);
        formData.append(message_type === "text" ? "message" : "media", message);

        try {
            const response = await fetch("http://localhost:5000/api/conversations/send", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: formData,
            });
            if (!response.ok) throw new Error(`Failed to send ${message_type}`);
            const data = await response.json();
            socket.emit("sendMessage", {
            conversation_id: selectedChat.conversation_id,
            sender_id: currentUser.user_id,
            message: message_type === "text" ? message : data.message_url,
            message_type,
            });
        } catch (error) {
            console.error(`Error sending ${message_type}:`, error);
        }
        };

        if (newMessage.trim()) {
        await sendMessageData(newMessage, "text");
        }
        if (selectedImage) {
        await sendMessageData(selectedImage, "media");
        }

        setNewMessage("");
        setSelectedImage(null);
    };

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        return isNaN(date.getTime()) ? "Just now" : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

  return (
    <div className="messages-container">
      {showContacts && (
        <div className="popup" ref={popupRef}>
          <div className="popup-header">
            <h3>Messages</h3>
            <X
              size={20}
              onClick={() => {
                setSelectedChat(null);
                setShowContacts(false);
                onClose();
              }}
              className="mess-close-btn"
            />
          </div>
          <div className="popup-body">
            {contacts.map((contact) => (
              <div key={contact.user_id} className="contact-item" onClick={() => openChat(contact)}>
                <Avatar userId={contact.user_id} showPopup={false} />
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedChat && (
        <div className="chat-popup">
          <div className="chat-header">
            <Avatar userId={selectedChat.user_id} showPopup={false} />
            <X
              size={20}
              onClick={() => {
                setSelectedChat(null);
                setShowContacts(false);
                onClose();
              }}
              className="mess-close-btn"
            />
          </div>
          <div className="chat-body" ref={chatBodyRef}>
            {(messages[selectedChat.conversation_id]?.messages || []).map((msg, idx, arr) => (
              <div
                key={msg.message_id}
                ref={idx === arr.length - 1 ? topMessageRef : null}
                className={`message-container ${msg.sender_id === currentUser.user_id ? "sent" : "received"}`}
              >
                {msg.sender_id !== currentUser.user_id && (
                  <Avatar
                    userId={msg.sender_id}
                    showPopup={false}
                    showName={false}
                    className="message-avatar"
                  />
                )}
                <div className="chat-message">
                  {msg.message_type === "text" && (
                    <div className="message-text-container">
                      <span className="message-text">{msg.message || msg.content}</span>
                    </div>
                  )}
                  {msg.message_type === "media" && msg.message && (
                    <div className="message-media-container">
                      <img
                        src={msg.message}
                        alt="Sent media"
                        style={{ maxWidth: "300px", maxHeight: "400px", objectFit: "contain" }}
                      />
                    </div>
                  )}
                  <div className="message-time">
                    {formatTimestamp(msg.timestamp)}
                    {msg.sender_id === currentUser.user_id && (
                      <span className="read-status">{msg.is_read ? "✔️" : "⏳"}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedImage && (
            <div className="mess-image-preview">
              <img src={URL.createObjectURL(selectedImage)} alt="Preview" />
              <button onClick={() => setSelectedImage(null)}>✖</button>
            </div>
          )}

          <div className="chat-footer">
            <label htmlFor="image-upload" className="mess-image-upload-btn">📷</label>
            <input
              type="file"
              id="image-upload"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => setSelectedImage(e.target.files[0])}
            />
            <textarea
              rows={1}
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 60) + "px";
              }}
              onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              onPaste={(e) => handlePasteMess(e, setSelectedImage, setNewMessage)}
              style={{ maxHeight: "60px", resize: "none", overflowY: "auto" }}
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;