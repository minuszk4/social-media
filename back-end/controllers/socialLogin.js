const express = require("express");
const jwt = require("jsonwebtoken");
const admin = require("../models/firebaseAdmin"); 
const User = require("../models/user");
require("dotenv").config();

const googleLogin = async (req, res) => {
    try {
        const { idToken } = req.body;

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const { email, name, picture, uid } = decodedToken;
        console.log("Decoded Token:", decodedToken); // Log the decoded token for debugging

        let user = await User.findByEmail(email);
        console.log("User found:", user); // Log the user found in the database
        if (!user) {
            user = await User.createWithSocial({
                socialId: uid,
                email,
                username: email.split("@")[0],
                fullName: name,
                provider: "google",
                avatar: picture
            });
        }

        const token = jwt.sign({ userId: user.user_id }, process.env.JWT_SECRET, { expiresIn: "7d" });

        res.json({ token, user_id: user.user_id });
    } catch (error) {
        console.error("Google Login Error:", error);
        res.status(500).json({ error: "Lỗi server!" });
    }
};

module.exports = { googleLogin };
