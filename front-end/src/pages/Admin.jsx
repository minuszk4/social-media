import React, { useState, useEffect, useMemo } from 'react';
import {
  Container, Typography, Button, Paper, TextField, CircularProgress,
} from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import PostAddIcon from '@mui/icons-material/PostAdd';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import '../assets/css/Admin.css';
import '../assets/css/Stories.css'; // Import Stories CSS
import Avatar from '../assets/components/Avatar';
import Post from '../assets/components/Post';
import { useNavigate } from 'react-router-dom'; // Added for navigation

const ADMIN_SECTIONS = [
  { label: 'Dashboard', icon: <DashboardIcon />, index: 0 },
  { label: 'Manage Users', icon: <PeopleIcon />, index: 1 },
  { label: 'Manage Posts', icon: <PostAddIcon />, index: 2 },
  { label: 'Manage Stories', icon: <HistoryEduIcon />, index: 3 },
];

const Admin = () => {
  const [tabIndex, setTabIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [stories, setStories] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [userStatuses, setUserStatuses] = useState({});
  const [selectedStoryId, setSelectedStoryId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const limit = 10;
  const navigate = useNavigate(); // Added for navigation
  // Memoize grouped stories
  const groupedStories = useMemo(() => {
    return stories.reduce((acc, story) => {
      if (!acc[story.user_id]) acc[story.user_id] = [];
      acc[story.user_id].push(story);
      return acc;
    }, {});
  }, [stories]);

  // Memoize filtered stories
  const filteredStories = useMemo(() => {
    return stories.filter(story =>
      (story.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (story.user_id || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [stories, searchTerm]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No authentication token found');

        switch (tabIndex) {
          case 0: // Dashboard
            try {
              const res = await fetch('http://localhost:5000/api/admin/dashboard', {
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
              });
              if (!res.ok) throw new Error(`Dashboard fetch failed: ${res.status}`);
              const data = await res.json();
              if (data && typeof data === 'object') {
                setDashboardData(data);
              } else {
                throw new Error('Invalid dashboard data');
              }
            } catch (err) {
              console.error("Dashboard error:", err);
              setDashboardData({ totalUsers: 0, totalPosts: 0 });
            }
            break;

          case 1: // Users
            const resUsers = await fetch('http://localhost:5000/api/admin/users', {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!resUsers.ok) throw new Error(`Users fetch failed: ${resUsers.status}`);
            const usersData = await resUsers.json();
            setUsers(usersData);
            const statusPromises = usersData.map(user =>
              fetch(`http://localhost:5000/api/online-status/${user.user_id}`).then(res => res.json())
            );
            const statusData = await Promise.all(statusPromises);
            const statusMap = statusData.reduce((acc, data, index) => {
              acc[usersData[index].user_id] = data.online;
              return acc;
            }, {});
            setUserStatuses(statusMap);
            break;

          case 2: // Posts
            const resPosts = await fetch('http://localhost:5000/api/admin/posts', {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!resPosts.ok) throw new Error(`Posts fetch failed: ${resPosts.status}`);
            setPosts(await resPosts.json());
            break;

          case 3: // Stories
            const resStories = await fetch(
              `http://localhost:5000/api/admin/stories?limit=${limit}&page=${page}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );
            if (!resStories.ok) throw new Error(`Stories fetch failed: ${resStories.status}`);
            const storiesData = await resStories.json();
            setStories(prev => [...prev, ...storiesData]);
            setHasMore(storiesData.length >= limit);
            if (storiesData.length > 0 && !selectedStoryId) {
              setSelectedStoryId(storiesData[0].story_id);
            }
            break;

          default:
            console.warn('Unknown tabIndex:', tabIndex);
        }
      } catch (err) {
        setError(err.message);
        toast.error(err.message === 'No authentication token found' ? 'Please log in' : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tabIndex, page]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setSelectedStoryId(filteredStories.length > 0 ? filteredStories[0].story_id : null);
  };

  const handleDeleteUser = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Delete user failed: ${res.status}`);
      setUsers(users.filter(user => user.user_id !== id));
      toast.success('User deleted');
    } catch (err) {
      toast.error('Failed to delete user');
      console.error(err);
    }
  };

  const handleDeletePost = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/admin/posts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Delete post failed: ${res.status}`);
      setPosts(posts.filter(post => post.post_id !== id));
      toast.success('Post deleted');
    } catch (err) {
      toast.error('Failed to delete post');
      console.error(err);
    }
  };

  const handleDeleteStory = async (storyId) => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/stories/${storyId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        toast.error('Unauthorized. Please log in again.');
        return;
      }
      if (!res.ok) throw new Error(`Delete story failed: ${res.status}`);
      setStories(stories.filter(story => story.story_id !== storyId));
      const remainingStories = filteredStories.filter(story => story.story_id !== storyId);
      if (remainingStories.length > 0) {
        setSelectedStoryId(remainingStories[0].story_id);
      } else {
        setSelectedStoryId(null);
      }
      toast.success('Story deleted');
    } catch (err) {
      toast.error('Failed to delete story: ' + err.message);
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredUsers = users.filter(user =>
    (user.name || user.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPosts = posts.filter(post =>
    (post.content || post.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (post.author || post.user_id || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const handleStoryClick = (storyId) => {
    setSelectedStoryId(storyId);
  };

  const handlePrevStory = () => {
    const currentStory = stories.find(story => story.story_id === selectedStoryId);
    if (!currentStory) return;
    const userStories = groupedStories[currentStory.user_id] || [];
    const currentIndex = userStories.findIndex(story => story.story_id === selectedStoryId);
    if (currentIndex > 0) {
      setSelectedStoryId(userStories[currentIndex - 1].story_id);
    } else {
      const userIds = Object.keys(groupedStories);
      const currentUserIndex = userIds.indexOf(currentStory.user_id);
      if (currentUserIndex > 0) {
        const prevUserId = userIds[currentUserIndex - 1];
        const prevUserStories = groupedStories[prevUserId];
        setSelectedStoryId(prevUserStories[prevUserStories.length - 1].story_id);
      }
    }
  };

  const handleNextStory = () => {
    const currentStory = stories.find(story => story.story_id === selectedStoryId);
    if (!currentStory) return;
    const userStories = groupedStories[currentStory.user_id] || [];
    const currentIndex = userStories.findIndex(story => story.story_id === selectedStoryId);
    if (currentIndex < userStories.length - 1) {
      setSelectedStoryId(userStories[currentIndex + 1].story_id);
    } else {
      const userIds = Object.keys(groupedStories);
      const currentUserIndex = userIds.indexOf(currentStory.user_id);
      if (currentUserIndex < userIds.length - 1) {
        const nextUserId = userIds[currentUserIndex + 1];
        setSelectedStoryId(groupedStories[nextUserId][0].story_id);
      }
    }
  };

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };

  const renderContent = () => {
    if (loading && page === 1) return <CircularProgress />;
    if (error) return <Typography color="error">Error: {error}</Typography>;

    switch (tabIndex) {
      case 0:
        return (
          <>
            <Typography variant="h5">Dashboard Overview</Typography>
            <div className="dashboard-stats">
              {dashboardData ? (
                <>
                  <Typography variant="h6">👥 Total Users: {dashboardData.totalUsers}</Typography>
                  <Typography variant="h6">📝 Total Posts: {dashboardData.totalPosts}</Typography>
                </>
              ) : (
                <Typography>No dashboard data available</Typography>
              )}
            </div>
          </>
        );
      case 1:
        return (
          <>
            <Typography variant="h5">User Management</Typography>
            <TextField
              label="Search Users"
              variant="outlined"
              fullWidth
              margin="normal"
              value={searchTerm}
              onChange={handleSearchChange}
            />
            <ul className="item-list">
              {filteredUsers.map(user => (
                <li key={user.user_id} className="list-item">
                  <Avatar userId={user.user_id} />
                  <span>{user.email}</span>
                  <span className={`status ${userStatuses[user.user_id] ? 'online' : 'offline'}`}>
                    {userStatuses[user.user_id] ? 'Online' : 'Offline'}
                  </span>
                  <div className="user-stats">
                    <Typography variant="body2">Posts: {user.total_posts}</Typography>
                    <Typography variant="body2">Friends: {user.total_friends}</Typography>
                    <Typography variant="body2">Sent: {user.messages_sent}</Typography>
                    <Typography variant="body2">Received: {user.messages_received}</Typography>
                    <Typography variant="body2">Comments: {user.total_comments}</Typography>
                    <Typography variant="body2">Reactions: {user.total_reactions}</Typography>
                  </div>
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={() => handleDeleteUser(user.user_id)}
                    aria-label={`Delete user ${user.email}`}
                  >
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          </>
        );
      case 2:
        return (
          <>
            <Typography variant="h5">Post Management</Typography>
            <TextField
              label="Search Posts"
              variant="outlined"
              fullWidth
              margin="normal"
              value={searchTerm}
              onChange={handleSearchChange}
            />
            <div className="post-list">
              {filteredPosts.map(post => (
                <div key={post.post_id} className="post-wrapper">
                  <Post post={post} onPostDelete={handleDeletePost} />
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={() => handleDeletePost(post.post_id)}
                    aria-label={`Delete post ${post.post_id}`}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          </>
        );
        case 3:
          return (
            <div className="fb-wrapper">
              <div className="fb-sidebar">
                <h2 className="fb-title">Stories by User</h2>
                <TextField
                  label="Search Stories"
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  aria-label="Search stories by user name or ID"
                  className="white-text-field"
                />
                {loading && page === 1 ? (
                  <CircularProgress />
                ) : filteredStories.length === 0 ? (
                  <Typography>No stories found.</Typography>
                ) : (
                  <div className="user-stories-list">
                    {Object.entries(groupedStories).map(([userId, userStories]) => {
                      const matchingStories = userStories.filter(story =>
                        (story.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (story.user_id || '').toLowerCase().includes(searchTerm.toLowerCase())
                      );
                      if (matchingStories.length === 0) return null;

                      return (
                        <div key={userId} className="user-story-group">
                          <div className="user-header">
                            <Avatar userId={userId} />
                          </div>
                          <div className="story-items">
                            {matchingStories.map(story => (
                              <div
                                key={story.story_id}
                                className={`fb-story-item ${
                                  story.story_id === selectedStoryId ? 'active' : ''
                                }`}
                                onClick={() => handleStoryClick(story.story_id)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) =>
                                  e.key === 'Enter' && handleStoryClick(story.story_id)
                                }
                                aria-label={`View story by ${story.full_name}`}
                              >
                                <Typography variant="body2">
                                  {formatTimestamp(story.created_at)}
                                </Typography>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {hasMore && (
                  <Button
                    variant="outlined"
                    onClick={handleLoadMore}
                    disabled={loading}
                    aria-label="Load more stories"
                    sx={{ mt: 2 }}
                  >
                    {loading ? <CircularProgress size={24} /> : 'Load More'}
                  </Button>
                )}
              </div>
              <div className="fb-content">
                {selectedStoryId &&
                stories.find(story => story.story_id === selectedStoryId) ? (
                  <>
                    <Button
                      onClick={handlePrevStory}
                      className="fb-nav-btn"
                      aria-label="Previous story"
                      disabled={
                        stories.find(story => story.story_id === selectedStoryId)
                          .user_id === Object.keys(groupedStories)[0] &&
                        groupedStories[
                          stories.find(story => story.story_id === selectedStoryId).user_id
                        ].findIndex(story => story.story_id === selectedStoryId) === 0
                      }
                      sx={{ position: 'absolute', left: 0 }}
                    >
                      <FontAwesomeIcon icon={faArrowLeft} />
                    </Button>
                    <div className="story-content-box">
                      <div className="fb-header">
                        <Avatar
                          userId={
                            stories.find(story => story.story_id === selectedStoryId)
                              .user_id
                          }
                        />
                        <Typography className="fb-time">
                          {formatTimestamp(
                            stories.find(story => story.story_id === selectedStoryId)
                              .created_at
                          )}
                        </Typography>
                        <div className="fb-header-buttons">
                          <Button
                            variant="contained"
                            color="secondary"
                            onClick={() => handleDeleteStory(selectedStoryId)}
                            disabled={isDeleting}
                            aria-label="Delete story"
                          >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                          </Button>
                        </div>
                      </div>
                      <img
                        src={
                          stories.find(story => story.story_id === selectedStoryId)
                            .media_url || 'placeholder-image.jpg'
                        }
                        alt={`Story by ${
                          stories.find(story => story.story_id === selectedStoryId)
                            .full_name
                        }`}
                        className="fb-story-img"
                      />
                      {stories.find(story => story.story_id === selectedStoryId).text && (
                        <Typography className="fb-text-box">
                          {
                            stories.find(story => story.story_id === selectedStoryId).text
                          }
                        </Typography>
                      )}
                    </div>
                    <Button
                      onClick={handleNextStory}
                      className="fb-nav-btn"
                      aria-label="Next story"
                      disabled={
                        stories.find(story => story.story_id === selectedStoryId)
                          .user_id ===
                          Object.keys(groupedStories)[
                            Object.keys(groupedStories).length - 1
                          ] &&
                        groupedStories[
                          stories.find(story => story.story_id === selectedStoryId).user_id
                        ].findIndex(story => story.story_id === selectedStoryId) ===
                          groupedStories[
                            stories.find(story => story.story_id === selectedStoryId)
                              .user_id
                          ].length - 1
                      }
                      sx={{ position: 'absolute', right: 0 }}
                    >
                      <FontAwesomeIcon icon={faArrowRight} />
                    </Button>
                  </>
                ) : (
                  <div className="fb-content no-stories">
                    <Typography>No story selected or no stories available.</Typography>
                  </div>
                )}
              </div>
            </div>
          );
        default:
        return null;
    }
  };

  return (
    <Container className="admin-container">
      <div className="admin-background" />
      <header className="admin-header fixed-header"
        onClick={() => window.location.href = '/admin'} 
        style={{ cursor: 'pointer' }}   
        >
      <Typography variant="h4" >Admin Dashboard</Typography>
      </header>
      <aside className="admin-sidebar open">
        <ul className="sidebar-menu">
          {ADMIN_SECTIONS.map(section => (
            <li
              key={section.index}
              className={tabIndex === section.index ? 'active' : ''}
              onClick={() => {
                setTabIndex(section.index);
                setSearchTerm('');
                setPage(1);
                setStories([]);
                setSelectedStoryId(null);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setTabIndex(section.index)}
              aria-label={`Switch to ${section.label}`}
            >
              {section.icon}
              <span>{section.label}</span>
            </li>
          ))}
        </ul>
      </aside>
      <main className="admin-content">
        <Paper className="content-box">{renderContent()}</Paper>
      </main>
    </Container>
  );
};

export default Admin;