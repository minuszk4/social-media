import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const navigate = useNavigate();
  const [auth, setAuth] = useState({
    token: localStorage.getItem("token") || null,
    userId: localStorage.getItem("user_id") || null,
  });
  const [message, setMessage] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Cập nhật auth khi localStorage thay đổi
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("user_id");
    setAuth({ token, userId });
  }, []);

  // Hàm đăng nhập
  const handleLogin = (token, userId) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user_id", userId);
    setAuth({ token, userId });
    navigate("/home");
  };

  // Hàm đăng xuất
  const handleLogout = () => {
    localStorage.clear();
    setAuth({ token: null, userId: null });
    navigate("/login");
  };

  const handleHomeClick = () => {
    setIsSearching(false);
    navigate("/home");
  };

  const handleStoriesClick = () => {
    navigate("/stories");
  };

  const handleFriendsClick = () => {
    navigate("/friends");
  };

  const openSettings = () => setIsSettingsOpen(true);
  const closeSettings = () => setIsSettingsOpen(false);

  return (
    <AppContext.Provider
      value={{
        auth,
        handleLogin,
        handleLogout,
        message,
        setMessage,
        handleHomeClick,
        handleFriendsClick,
        isSettingsOpen,
        openSettings,
        closeSettings,
        handleStoriesClick,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);