import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../assets/css/Register.css";
import { FaFacebookF, FaGoogle } from "react-icons/fa";
import { auth, googleProvider, facebookProvider } from "../../../back-end/models/firebaseConfig";
import { getAuth, signInWithPopup } from "firebase/auth";

const Register = () => {
    const [fullName, setFullName] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [agreeTerms, setAgreeTerms] = useState(false);
    const [error, setError] = useState("");
    const [isSocialRegister, setIsSocialRegister] = useState(false);
    const [socialUser, setSocialUser] = useState(null);
    const navigate = useNavigate();
    const [showPopup, setShowPopup] = useState(false);

    const validateInputs = () => {
        if (!fullName || !username || !email || !password) {
            setError("All fields are required");
            return false;
        }
        if (!/\S+@\S+\.\S+/.test(email)) {
            setError("Invalid email format");
            return false;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters");
            return false;
        }
        return true;
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!validateInputs()) return;

        try {
            const response = await fetch("http://localhost:5000/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fullName, username, email, password }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Registration failed");

            navigate("/login");
        } catch (error) {
            setError(error.message);
        }
    };

    const handleSocialRegister = async (provider, type) => {
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            const response = await fetch("http://localhost:5000/api/auth/social-register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    socialId: user.uid,
                    email: user.email,
                    avatar: user.photoURL,
                    username: "",
                    fullName: user.displayName,
                    provider: type,
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || `Đăng ký bằng ${type} thất bại!`);

            if (data.requireUsername) {
                setSocialUser({
                    socialId: user.uid,
                    email: user.email,
                    avatar: user.photoURL,
                    provider: type,
                });
                setShowPopup(true);
            } else {
                localStorage.setItem("token", data.token);
                localStorage.setItem("user_id", data.user_id);
                navigate("/home");
            }
        } catch (error) {
            setError(error.message);
        }
    };

    const submitSocialRegister = async () => {
        if (!username || !fullName) {
            alert("Vui lòng nhập username và full name!");
            return;
        }

        try {
            const response = await fetch("http://localhost:5000/api/auth/social-register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...socialUser, username, fullName }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Lỗi đăng ký!");

            localStorage.setItem("token", data.token);
            localStorage.setItem("user_id", data.user_id);
            navigate("/home");
        } catch (error) {
            alert(error.message);
        }
    };

    return (
        <div className="register-container">
            <div className="register">
                {error && <p className="error">{error}</p>}
                <div className="register-form">
                    <div className="create-account">
                        <div className="create">Create an account</div>
                        <div className="log-in-instead" onClick={() => navigate("/login")}>
                            Log in instead
                        </div>
                    </div>

                    {isSocialRegister ? (
                        <>
                            <h3>Chọn thông tin tài khoản</h3>
                            <input
                                type="text"
                                placeholder="Nhập username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                            <input
                                type="text"
                                placeholder="Nhập họ và tên"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                            />
                            <button onClick={submitSocialRegister}>Xác nhận</button>
                        </>
                    ) : (
                        <>
                            <form onSubmit={handleRegister}>
                                <div className="text_input">
                                    <label>Full name</label>
                                    <input
                                        type="text"
                                        placeholder="Enter your full name"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                    />
                                </div>
                                <div className="text_input">
                                    <label>Username</label>
                                    <input
                                        type="text"
                                        placeholder="Enter your username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                    />
                                </div>
                                <div className="text_input">
                                    <label>Email</label>
                                    <input
                                        type="text"
                                        placeholder="Enter your email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                                <div className="text_input">
                                    <label>Password</label>
                                    <input
                                        type="password"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                                <div className="check-box">
                                    <input
                                        type="checkbox"
                                        checked={agreeTerms}
                                        onChange={() => setAgreeTerms(!agreeTerms)}
                                    />
                                    <span>By creating an account, I agree to the Terms of Use and Privacy Policy</span>
                                </div>
                                <button type="submit" disabled={!agreeTerms}>Create an account</button>
                                <div className="or-container">
                                    <div className="line"></div>
                                    <span> OR</span>
                                    <div className="line"></div>
                                </div>
                            </form>

                            {/* <button className="facebook" onClick={() => handleSocialRegister(facebookProvider, "facebook")}>
                                <FaFacebookF className="rg-fb" size={20} />
                                <span>Continue with Facebook</span>
                            </button> */}
                            <button className="google" onClick={() => handleSocialRegister(googleProvider, "google")}>
                                <FaGoogle className="rg-google" size={20} />
                                <span>Continue with Google</span>
                            </button>
                        </>
                    )}
                </div>
                <div className="welcome-img">
                    <img src="./src/assets/images/welcome-img.png" alt="Welcome" />
                </div>
            </div>
            {showPopup && (
                <div className="re-popup">
                    <div className="re-popup-content">
                        <h3>Nhập thông tin tài khoản</h3>
                        <input
                            type="text"
                            placeholder="Nhập username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="Nhập họ và tên"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                        />
                        <button onClick={submitSocialRegister}>Xác nhận</button>
                        <button onClick={() => setShowPopup(false)}>Hủy</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Register;
