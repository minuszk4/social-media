const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const router = express.Router();
const { createAvatar } = require("../utils/genAvt"); // Assuming you have a function to create avatar URL
require("dotenv").config();

const socialRegister = async (req, res) => {
    try {
        const { socialId, email, username, fullName, provider } = req.body;

        if (!socialId || !email || !provider) {
            return res.status(400).json({ error: "Thiếu thông tin cần thiết!" });
        }

        // Check if the user already exists with the provided email
        let user = await User.findByEmail(email);

        if (user) {
            // If user exists, generate a token
            const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
                expiresIn: "7d",
            });

            return res.json({ token, user_id: user._id });
        } else {
            // If the user doesn't exist, request a username and full name
            if (!username || !fullName) {
                return res.json({ requireUsername: true });
            }

            const avatarUrl = await createAvatar(fullName, socialId);

            // Create new user in the database
            user = await User.createWithSocial({ socialId, email, username, fullName, provider, avatarUrl });

            // Generate a token for the newly created user
            console.log("New user created:", user);
            const token = jwt.sign({ userId: user.userId }, process.env.JWT_SECRET, {
                expiresIn: "7d",
            });

            // Return the token and user ID
            res.json({ token, user_id: user.userId });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Lỗi server!" });
    }
};
            // Generate avatar URL based on full name and social ID

module.exports = { socialRegister };
