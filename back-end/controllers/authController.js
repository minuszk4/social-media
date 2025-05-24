const User = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const db = require("../models/db");
const { google } = require("googleapis");
const { createAvatar } = require("../utils/genAvt"); 
const OAuth2 = google.auth.OAuth2;

require("dotenv").config(); 
const JWT_SECRET = process.env.JWT_SECRET;

const register = async (req, res) => {
    const { fullName, username, email, password } = req.body;
    if (!fullName || !username || !email || !password) {
        return res.status(400).json({ error: "Missing required fields" });
    }
    console.log("Registering user:", req.body);
    try {
        const existingUser = await User.findByUsername(username);
        if (existingUser) {
            return res.status(400).json({ error: "Username already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({ fullName, username, email, password: hashedPassword });
        const avatarUrl = await createAvatar(fullName, newUser.userId);
        await db.execute("UPDATE UserProfiles SET avatar_url = ? WHERE user_id = ?", [avatarUrl, newUser.userId]);

        console.log("New user:", newUser);
        res.status(201).json({ message: "User registered successfully", userId: newUser.userId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const login = async (req, res) => {
    const { username, password } = req.body;
    console.log("Logging in user:", req.body);
    try {
        const user = await User.findByUsername(username);
        console.log("User found:", user);

        if (!user) {
            return res.status(400).json({ error: "Invalid username or password 1" });
        }

        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            return res.status(400).json({ error: "Invalid username or password 2 " });
        }
        const token = jwt.sign(
            { user_id: user.user_id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );
        res.status(200).json({ 
            message: "Login successful", 
            user_id: user.user_id,
            token: token 
        });   
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
const forgotPassword = async (req, res) => {
    const { email } = req.body;
    const user = await User.findByEmail({ email });
    if (!user) {
        return res.status(404).json({ message: "Email không tồn tại." });
    }

    const token = jwt.sign({ id: user.user_id }, JWT_SECRET, { expiresIn: "1h" });
    const resetLink = `http://localhost:5173/reset-password/${token}`;

    const oauth2Client = new OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        "https://developers.google.com/oauthplayground"
    );

    oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    const accessToken = await oauth2Client.getAccessToken();
    console.log("Access Token:", accessToken.token);
    console.log(resetLink);
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            type: "OAuth2",
            user: process.env.GMAIL_ADDRESS,
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
            accessToken: accessToken.token,
        },
    });
    // console.log("done");
    await transporter.sendMail({
        from: `SocialApp <${process.env.GMAIL_ADDRESS}>`,
        to: email,
        subject: "Reset your password",
        html: `<p>Click the link to reset your password:</p><a href="${resetLink}">${resetLink}</a>`,
    });
    console.log("Email sented successfully to:", email);
    res.json({ message: "Link reset mật khẩu đã được gửi qua email." });
};
const ResetPassword = async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: "Thiếu thông tin." });
    }
  
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log("Decoded token:", decoded);
        const userId = decoded.id;
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = `
            UPDATE Users
            SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?;
        `;
        const [result] = await db.execute(query, [hashedPassword, userId]);
        console.log("Update result:", result);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Người dùng không tìm thấy." });
        }
        res.json({ message: "Mật khẩu đã được đặt lại thành công." });
  
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Có lỗi xảy ra." });
    }
};
  
module.exports = { register, login,forgotPassword,ResetPassword };
