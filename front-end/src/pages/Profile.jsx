import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FaCamera, FaCog } from "react-icons/fa";
import LeftSidebar from "../assets/components/LeftSidebar";
import { useAppContext } from "../context/AppContext";
import "../assets/css/Profile.css";
import Post from "../assets/components/Post";
import Messages from "../assets/components/Messages";

const Profile = () => {
    const { handleHomeClick, setMessage, handleLogout } = useAppContext();
    const { profileId } = useParams();
    const [profileData, setProfileData] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState({ profile: true, posts: true, friendStatus: true });
    const [error, setError] = useState(null);
    const [userId, setUserId] = useState(localStorage.getItem("user_id"));
    const [friendStatus, setFriendStatus] = useState(null);
    const [showMessages, setShowMessages] = useState(false);
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [bio, setBio] = useState("");
    const [fullName, setFullName] = useState("");
    const [avatar, setAvatar] = useState("");
    const [selectedFile, setSelectedFile] = useState(null);
    const token = localStorage.getItem("token");

    // Validate token and userId
    useEffect(() => {
        if (!token || !userId) {
            setError("You must be logged in to view this page.");
            setLoading({ profile: false, posts: false, friendStatus: false });
        }
    }, [token, userId]);

    // Fetch profile data
    useEffect(() => {
        if (!profileId || !token) return;

        const fetchProfile = async () => {
            try {
                const response = await fetch(`http://localhost:5000/api/profile/${profileId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!response.ok) throw new Error("Failed to fetch profile");
                const data = await response.json();
                setProfileData(data);
                setBio(data.bio || "");
                setFullName(data.full_name || "");
                setAvatar(data.avatar_url || "");
            } catch (error) {
                console.error("Error fetching profile:", error);
                setError("Failed to load profile.");
                setProfileData(null);
            } finally {
                setLoading((prev) => ({ ...prev, profile: false }));
            }
        };

        fetchProfile();
    }, [profileId, token]);

    // Fetch posts and friend status
    useEffect(() => {
        if (!profileId || !userId || !token) return;

        const fetchPosts = async () => {
            try {
                const url = userId === profileId
                    ? `http://localhost:5000/api/posts/my-posts/?user_id=${profileId}`
                    : `http://localhost:5000/api/posts/profilePost/?user_id=${userId}&profile_id=${profileId}`;
                const response = await fetch(url, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!response.ok) throw new Error("Failed to fetch posts");
                const data = await response.json();
                setPosts(data);
            } catch (error) {
                console.error("Error fetching posts:", error);
                setError("Failed to load posts.");
                setPosts([]);
            } finally {
                setLoading((prev) => ({ ...prev, posts: false }));
            }
        };

        const fetchFriendStatus = async () => {
            if (userId === profileId) {
                setFriendStatus(null);
                setLoading((prev) => ({ ...prev, friendStatus: false }));
                return;
            }
            try {
                const response = await fetch(
                    `http://localhost:5000/api/friends/status?user_id=${userId}&friend_id=${profileId}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (!response.ok) throw new Error("Failed to fetch friend status");
                const data = await response.json();
                setFriendStatus(data);
            } catch (error) {
                console.error("Error fetching friend status:", error);
                setError("Failed to load friend status.");
                setFriendStatus(null);
            } finally {
                setLoading((prev) => ({ ...prev, friendStatus: false }));
            }
        };

        fetchPosts();
        fetchFriendStatus();
    }, [profileId, userId, token]);

    // Handle profile editing
    const handleEditClick = () => {
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setBio(profileData?.bio || "");
        setFullName(profileData?.full_name || "");
        setAvatar(profileData?.avatar_url || "");
        setSelectedFile(null);
    };

    const handleUpdateProfile = async () => {
        const formData = new FormData();
        if (bio !== profileData?.bio) formData.append("bio", bio);
        if (fullName !== profileData?.full_name) formData.append("full_name", fullName);
        if (selectedFile) formData.append("avatar", selectedFile);

        try {
            const response = await fetch(`http://localhost:5000/api/profile/${profileId}`, {
                method: "PUT",
                body: formData,
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error("Failed to update profile");
            const updatedData = await response.json();
            setProfileData((prev) => ({
                ...prev,
                bio: updatedData.bio || prev.bio,
                full_name: updatedData.full_name || prev.full_name,
                avatar_url: updatedData.avatar_url || prev.avatar_url,
            }));
            setIsEditing(false);
            setSelectedFile(null);
            setMessage("Profile updated successfully!");
        } catch (error) {
            console.error("Error updating profile:", error);
            setError("Failed to update profile.");
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setAvatar(URL.createObjectURL(file));
        }
    };

    // Handle friend actions
    const handleFriendAction = async (action) => {
        try {
            const actions = {
                send: "http://localhost:5000/api/friends/send",
                cancel: "http://localhost:5000/api/friends/cancel",
                unfriend: "http://localhost:5000/api/friends/unfriend",
                accept: "http://localhost:5000/api/friends/accept",
                reject: "http://localhost:5000/api/friends/reject",
            };
            const url = actions[action];
            if (!url) throw new Error("Invalid friend action");

            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ user_id: userId, friend_id: profileId }),
            });
            if (!response.ok) throw new Error("Friend action failed");
            const data = await response.json();
            setFriendStatus(data.new_status ? { status: data.new_status } : data);
            setMessage(`${action.charAt(0).toUpperCase() + action.slice(1)} action successful!`);
        } catch (error) {
            console.error("Error handling friend action:", error);
            setError("Failed to perform friend action.");
        }
    };

    // Handle messaging
    const handleOpenMessages = async () => {
        let conversation = conversations.find((convo) => convo.participants.includes(profileId));
        if (!conversation) {
            try {
                const response = await fetch("http://localhost:5000/api/conversations/create", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ user_id: userId, friend_id: profileId }),
                });
                if (!response.ok) throw new Error("Failed to create conversation");
                conversation = await response.json();
                setConversations([...conversations, conversation]);
            } catch (error) {
                console.error("Error creating conversation:", error);
                setError("Failed to open messages.");
                return;
            }
        }
        setSelectedConversation(conversation);
        setShowMessages(true);
    };

    const handleCloseMessages = () => {
        setShowMessages(false);
        setSelectedConversation(null);
    };

    // Render conditions
    if (!profileId) return <div className="text-red-500 text-center">Invalid profile.</div>;
    if (error) return <div className="text-red-500 text-center">{error}</div>;
    if (loading.profile) return <div className="text-gray-300 text-center">Loading profile...</div>;
    if (!profileData) return <div className="text-red-500 text-center">User not found.</div>;

    const isMyProfile = userId === profileId;
    const { username, full_name, avatar_url, followers } = profileData;

    // Friend status handling
    const isPending = friendStatus?.status === "pending";
    const isReceiver = isPending && friendStatus?.role === "receiver";
    const friendButtonText = () => {
        if (loading.friendStatus) return "Loading...";
        if (!friendStatus) return "Add Friend";
        switch (friendStatus.status) {
            case "friends": return "Unfriend";
            case "pending": return "Cancel Request";
            case "not_friends": return "Add Friend";
            default: return "Add Friend";
        }
    };

    return (
        <div className="profile-container">
            <LeftSidebar handleHomeClick={handleHomeClick} setMessage={setMessage} handleLogout={handleLogout} />
            <div className="profile-content">
                <div className="profile-header">
                    <div className="profile-avatar">
                        {isEditing ? (
                            <div className="edit-avatar">
                                <img src={avatar} alt="Avatar" />
                                <label className="avatar-upload">
                                    <FaCamera className="upload-icon" />
                                    <input type="file" accept="image/*" onChange={handleFileChange} />
                                </label>
                            </div>
                        ) : (
                            <img
                                src={avatar_url || "https://static.vecteezy.com/system/resources/previews/009/734/564/original/default-avatar-profile-icon-of-social-media-user-vector.jpg"}
                                onError={(e) => {
                                    e.target.src = "https://static.vecteezy.com/system/resources/previews/009/734/564/original/default-avatar-profile-icon-of-social-media-user-vector.jpg";
                                }}
                                alt="Avatar"
                            />
                        )}
                    </div>
                    <div className="profile-info">
                        {isEditing ? (
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="edit-fullname"
                                placeholder="Full Name"
                            />
                        ) : (
                            <>
                                <h1 className="profile-username">{full_name || "Unknown User"}</h1>
                                <p className="profile-fullname">{username || "No name provided"}</p>
                            </>
                        )}
                    </div>
                    <div className="profile-actions">
                        {isMyProfile ? (
                            <>
                                {isEditing ? (
                                    <>
                                        <button onClick={handleUpdateProfile} className="save-btn">Save</button>
                                        <button onClick={handleCancelEdit} className="cancel-btn">Cancel</button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={handleEditClick} className="edit">Edit profile</button>
                                        <FaCog className="text-xl cursor-pointer" />
                                    </>
                                )}
                            </>
                        ) : (
                            <>
                                <button onClick={handleOpenMessages} className="message-btn">Messages</button>
                                {isPending && isReceiver ? (
                                    <>
                                        <button onClick={() => handleFriendAction("accept")} className="accept-btn">Accept</button>
                                        <button onClick={() => handleFriendAction("reject")} className="reject-btn">Reject</button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => handleFriendAction(
                                            friendStatus?.status === "friends" ? "unfriend" :
                                            friendStatus?.status === "pending" ? "cancel" : "send"
                                        )}
                                        className="friend-btn"
                                        disabled={loading.friendStatus}
                                    >
                                        {friendButtonText()}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
                {isEditing ? (
                    <div className="edit-bio">
                        <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder="Tell us about yourself..."
                            rows="3"
                        />
                    </div>
                ) : (
                    <div className="profile-bio">
                        <p>{bio || "No bio yet"}</p>
                    </div>
                )}
                <div className="profile-stats">
                    <div className="profile-stat">
                        <p>{posts.length}</p>
                        <p className="label">Posts</p>
                    </div>
                    <div className="profile-stat">
                        <p>{followers || 0}</p>
                        <p className="label">Friends</p>
                    </div>
                </div>
                <div className="profile-posts">
                    {loading.posts ? (
                        <div className="text-gray-300 text-center">Loading posts...</div>
                    ) : posts.length > 0 ? (
                        <div className="posts-grid">
                            {posts.map((post) => (
                                <Post key={post.id} post={post} />
                            ))}
                        </div>
                    ) : (
                        <div className="share-photos">
                            <FaCamera className="icon" />
                            <h2>Share Photos</h2>
                            <p>When you share photos, they will appear on your profile.</p>
                            {isMyProfile && <button className="share-button">Share your first post</button>}
                        </div>
                    )}
                </div>
            </div>
            {showMessages && selectedConversation && (
                <div className="messages-overlay">
                    <button onClick={handleCloseMessages} className="close-messages-btn">Close</button>
                    <Messages
                        contacts={[{ user_id: profileId, full_name: profileData.full_name }]}
                        conversations={conversations}
                        currentUser={{ user_id: userId }}
                        selectedConversation={selectedConversation}
                    />
                </div>
            )}
        </div>
    );
};

export default Profile;