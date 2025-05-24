import React from "react";
import {
  Home, Search, MessageCircle, Bell, Camera, Users, Settings, LogOut
} from "lucide-react";
import "../css/LeftSidebar.css";
import { useAppContext } from "../../context/AppContext";
import SettingsPopup from "./Settings";
// Component LeftSidebar.js chịu trách nhiệm hiển thị thanh điều hướng bên trái trong giao diện của ứng dụng mạng xã hội. 
// Thanh điều hướng này chứa các biểu tượng để truy cập nhanh đến các tính năng chính như trang chủ, tìm kiếm, tin nhắn, thông báo, bạn bè và cài đặ
// Component LeftSidebar sử dụng các trạng thái từ useAppContext, bao gồm:

// handleHomeClick: Xử lý khi người dùng nhấn vào nút "Home".
// handleLogout: Xử lý khi người dùng nhấn vào nút "Log out".
// handleFriendsClick: Xử lý khi người dùng nhấn vào nút "Friends".
// setMessage: Mở giao diện tin nhắn khi nhấn vào "Messages".
// isSettingsOpen: Xác định cửa sổ cài đặt có đang mở hay không.
// openSettings: Hàm để mở popup cài đặt.
// closeSettings: Hàm để đóng popup cài đặt
/**
 * Component LeftSidebar hiển thị thanh điều hướng bên trái của ứng dụng mạng xã hội.
 * Nó bao gồm các nút điều hướng cho Trang chủ, Tìm kiếm, Tin nhắn, Thông báo, Câu chuyện và Bạn bè.
 * Nó cũng bao gồm các nút cho Cài đặt và Đăng xuất.
 *
 * @component
 * @example
 * return (
 *   <LeftSidebar />
 * )
 *
 * @returns {JSX.Element} Thành phần LeftSidebar được render.
 */

const LeftSidebar = () => {
  const { handleHomeClick, handleLogout, handleFriendsClick, setMessage, isSettingsOpen, openSettings, closeSettings,handleStoriesClick } = useAppContext();

  const menuItems = [
    { icon: Home, label: "Home", onClick: handleHomeClick },
    // { icon: Search, label: "Search", onClick: () => console.log("Search clicked") },
    { icon: MessageCircle, label: "Messages", onClick: () => setMessage(true) },
    // { icon: Bell, label: "Notifications", onClick: () => console.log("Notifications clicked") },

    { icon: Camera, label: "Stories", onClick: handleStoriesClick },
    { icon: Users, label: "Friends", onClick: handleFriendsClick }, 
    { icon: Settings, label: "Settings", onClick: openSettings },

  ];

  return (
    <>
      <div className="left-sidebar">
        <div className="icons">
          {menuItems.map(({ icon: Icon, label, onClick }) => (
            <button key={label} className="icon" onClick={onClick} aria-label={label}>
              <Icon size={20} /><span>{label}</span>
            </button>
          ))}
        </div>
        <div className="settings">
          {/* <button className="icon" onClick={openSettings} aria-label="Settings">
            <Settings size={20} /><span>Settings</span>
          </button> */}
          <button className="icon" onClick={handleLogout} aria-label="Log out">
            <LogOut size={20} /><span>Log out</span>
          </button>
        </div>
      </div>
      {isSettingsOpen && <SettingsPopup onClose={closeSettings} />} 
    </>
  );
};

export default LeftSidebar;
