import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../assets/css/Login.css';
import { FaFacebookF, FaGoogle } from 'react-icons/fa';
import { auth, googleProvider, facebookProvider, signInWithPopup } from "../../../back-end/models/firebaseConfig";

const Login = ({ className = "", ...props }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isLoading, setIsLoading] = useState(false);  // Loading state for external logins

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");
    
        if (!username || !password) {
            setError("Vui lòng nhập tên đăng nhập và mật khẩu!");
            return;
        }
    
        try {
            const response = await fetch("http://localhost:5000/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });
            const data = await response.json();

            localStorage.setItem("token", data.token);
            localStorage.setItem("user_id", data.user_id);
            console.log("Server response:", data);  
            if (!response.ok) throw new Error(data.error || "Đăng nhập thất bại!");
            setSuccess("Đăng nhập thành công!");
            navigate("/home"); 
        } catch (err) {
            setError(err.message);
        }
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const idToken = await result.user.getIdToken(); 
            console.log("Google User:", result.user);
    
            const response = await fetch("http://localhost:5000/api/auth/google-login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idToken }),
            });
    
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Đăng nhập thất bại!");
    
            localStorage.setItem("token", data.token);
            localStorage.setItem("user_id", data.user_id);
            navigate("/home");
        } catch (error) {
            console.error("Google Login Error:", error);
            setError("Đăng nhập bằng Google thất bại!");
        } finally {
            setIsLoading(false);  // Hide loading spinner after login attempt
        }
    };

    const handleFacebookLogin = async () => {
        setIsLoading(true);
        try {
            const result = await signInWithPopup(auth, facebookProvider);
            console.log("Facebook User:", result.user);
            navigate("/home");
        } catch (error) {
            console.error("Facebook Login Error:", error);
            setError("Đăng nhập bằng Facebook thất bại!");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`login ${className}`} {...props}>
            <div className="r-login">
                <div className="login2">
                    <div className="background"></div>
                    <div className="log-in">LOG IN </div>
                    {/* <FaFacebookF 
                        className="facebook-instance" 
                        size={48} 
                        onClick={handleFacebookLogin}
                    /> */}
                    <FaGoogle 
                        className="google-instance" 
                        size={48} 
                        onClick={handleGoogleLogin} 
                    />
                    <div className="forgot-your-pass" onClick={() => navigate('/forgot_password')}>
                        <span>Forgot your password?</span>
                    </div>

                    <form onSubmit={handleLogin}> 
                        <div className="email">
                            <label htmlFor="username">Email or username</label>
                            <input
                                type="text"
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                        <div className="password">
                            <label htmlFor="password">Password</label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)} 
                                required
                            />
                        </div>
                        <div className="login3">
                            <button type="submit" disabled={isLoading}>
                                {isLoading ? "Đang đăng nhập..." : "Login"}
                            </button>
                        </div>
                    </form>

                    {/* Error and Success message */}
                    {error && <div className="error-message">{error}</div>}
                    {success && <div className="success-message">{success}</div>}
                </div>
                <div className="rectangle-right">
                    <div className="sign-up">
                        <span>
                            <span className="sign-up-span">Don&#039;t have an account?</span>
                            <span className="sign-up-span2" onClick={() => navigate("/register")}>Sign up</span>
                        </span>
                    </div>
                </div>
            </div>

            <div className="l-login">
                <div className="rectangle-left">
                    <div className="welcome-img">
                        <img src="./src/assets/images/welcome-img.png" />
                    </div>
                    <div className="welcome-back">
                        Welcome back! Let&#039;s explore something new today
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
