import React, { useEffect } from 'react';
import './App.css';
import Login from './pages/Login';
import Register from './pages/Register';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'; 
import ForgotPassword from './pages/Forgot';
import Home from './pages/Home';
import Messages from './assets/components/Messages';
import SearchPage from "./pages/Search";
import Profile from './pages/Profile';
import Post from './assets/components/Post';
import Friend from './pages/Friend';
import Admin from './pages/Admin';
import Stories from './pages/StoryPage';
import ResetPassword from './pages/ResetPassword';
import { AppProvider } from './context/AppContext';
import PostPage from './pages/PostPage';
import socket from './assets/utils/socket'; // 👈 import socket client
import PrivateRoute from './assets/utils/PrivateRoute';
import AdminRoute from './assets/utils/adminRoutes';
function App() {
  useEffect(() => {
    const userId = localStorage.getItem("user_id"); 
    if (userId) {
      socket.on("connect", () => {
        console.log("Connected to socket:", socket.id);
        socket.emit("register", userId);
      });
    }

    return () => {
      socket.off("connect"); 
    };
  }, []);

  return (
    <AppProvider> 
      <div className="App">
        <header className="App-header">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot_password" element={<ForgotPassword />} /> 
            <Route path="/home" element={<PrivateRoute><Home /></PrivateRoute>} />
            <Route path="/mess" element={<PrivateRoute><Messages /></PrivateRoute>} />
            <Route path="/search" element={<PrivateRoute><SearchPage /></PrivateRoute>} />
            <Route path="/profile/:profileId" element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="/post" element={<PrivateRoute><Post /></PrivateRoute>} />
            <Route path="/post/:post_id" element={<PrivateRoute><PostPage /></PrivateRoute>} />
            <Route path="/friends" element={<PrivateRoute><Friend /></PrivateRoute>} />
            <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
            <Route path="/stories/:userId/:storyId" element={<PrivateRoute><Stories /></PrivateRoute>} />
            <Route path="/stories" element={<PrivateRoute><Stories /></PrivateRoute>} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
          </Routes>
        </header>
      </div>
    </AppProvider>
  );
}

export default App;
