import React, { useState } from "react";
import '../css/Settings.css';

const SettingsPopup = ({ onClose }) => {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChangePassword = async () => {
        if (newPassword !== confirmPassword) {
            setError("Mật khẩu mới không khớp!");
            return;
        }

        setError("");
        setLoading(true);

        try {
            const response = await fetch("http://localhost:5000/api/profile/change-password", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("token")}`,
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword,
                    })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || "Đổi mật khẩu thất bại!");
            } else {
                alert("Đổi mật khẩu thành công!");
                onClose();
            }
        } catch (err) {
            setError("Lỗi kết nối đến máy chủ!");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="settings-popup-overlay">
            <div className="settings-popup-content">
                <h2 className="settings-title">Đổi mật khẩu</h2>
                <form autoComplete="off">
                    <input
                        className="settings-input"
                        type="password"
                        placeholder="Mật khẩu hiện tại"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        autoComplete="new-password"
                    />
                    <input
                        className="settings-input"
                        type="password"
                        placeholder="Mật khẩu mới"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                    />
                    <input
                        className="settings-input"
                        type="password"
                        placeholder="Xác nhận mật khẩu"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                    />
                    {error && <p className="settings-error">{error}</p>}
                    <button
                        type="button"
                        className="settings-save-btn"
                        onClick={handleChangePassword}
                        disabled={loading}
                    >
                        {loading ? "Đang xử lý..." : "Lưu thay đổi"}
                    </button>
                    <button type="button" className="settings-close-btn" onClick={onClose}>
                        Đóng
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SettingsPopup;
