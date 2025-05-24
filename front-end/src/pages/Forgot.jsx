import React, { useState } from "react";
import "../assets/css/Forgot.css";
import { FaLock, FaArrowRight } from "react-icons/fa";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:5000/api/auth/forgot-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
      });
      const data = await response.json();
      setMessage(data.message); 
      } catch (err) {
      setMessage(err.response?.data?.message || "Đã xảy ra lỗi.");
    }
  };

  return (
    <div className="forgotContainer">
      <div className="forgotBox">
        <FaLock className="lockIcon" size={40} />
        <p className="forgotText">
          <span className="title">Trouble logging in?</span>
          <br />
          <span className="subtitle">
            Enter your email, phone, or username and we’ll send you a link to
            get back into your account.
          </span>
        </p>
        <form className="email-sender" onSubmit={handleSubmit}>
          <input
            type="email"
            className="inputField"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" className="submitButton">
            <FaArrowRight className="arrowIcon" />
          </button>
        </form>
        {message && <p className="message">{message}</p>}
      </div>
    </div>
  );
};

export default ForgotPassword;
