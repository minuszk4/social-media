require("dotenv").config();
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: 'Authorization header missing or malformed' });
    }

    const token = authHeader.split(" ")[1];

    if (!token) return res.status(401).json({ message: 'Token is required' });

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;

        if (req.user.user_id === '952e1dda-cb9e-4784-9450-a4d0bdb837c2') {
            req.user.isAdmin = true;
        } else {
            req.user.isAdmin = false;
        }

        next();
    } catch (error) {
        return res.status(400).json({ message: 'Invalid Token' });
    }
};

module.exports = verifyToken;
