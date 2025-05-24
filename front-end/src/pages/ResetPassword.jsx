import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../assets/css/ResetPassword.css";

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);  // New state for success

  const handleReset = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setMessage("Mật khẩu xác nhận không khớp.");
      setSuccess(false);  // Set success to false on error
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(data.message);
        setSuccess(true);  // Set success to true on success
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else {
        setMessage(data.message || "Có lỗi xảy ra.");
        setSuccess(false);  // Set success to false on failure
      }
    } catch (err) {
      setMessage("Không thể kết nối đến máy chủ.");
      setSuccess(false);  // Set success to false if error occurs
    }
  };

  return (
    <div className="resetContainer">
      <div className="resetBox">
        <h2>Đặt lại mật khẩu</h2>
        <form onSubmit={handleReset} className="resetForm">
          <input
            type="password"
            placeholder="Mật khẩu mới"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Xác nhận mật khẩu"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <button type="submit">Xác nhận</button>
        </form>

        {/* Success or error message */}
        {message && (
          <p className={`resetMessage ${success ? "success" : "error"}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
