const express = require("express");
const cors = require("cors");
const http = require("http");
const authRoutes = require("./routes/authRoutes");
const setupSocket = require("./sockets/socket");
const postsRoutes = require("./routes/postsRoutes");
const friendRoutes = require("./routes/friendRoutes");
const searchRoutes = require("./routes/searchRoutes")
const profileRoutes = require("./routes/profileRoutes");
const reactionRoutes = require("./routes/reactionRoutes")
const commentRoutes = require('./routes/cmtRoutes');
const chatRoutes = require('./routes/chatRoutes')
const contactRoutes = require("./routes/contactRoutes");
const storyRoutes = require("./routes/storyRoutes")
const notifyRoutes = require("./routes/notifyRoutes")
const adminRoutes = require("./routes/adminRoutes")
const upload = require('./cloud/upload')
const verifyToken = require("./middleware/authMiddleware");
const trackOnline = require('./middleware/trackonline');
const onlineStatus = require('./routes/onlineStatus');


const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: ["http://localhost:5173","http://localhost:5174"],
    credentials: true
}));
app.use(express.json());

app.use("/api/auth", authRoutes);

app.use("/api/posts", verifyToken,trackOnline, postsRoutes);
app.use("/api/friends", verifyToken, friendRoutes);
app.use("/api/search", verifyToken, searchRoutes);
app.use("/api/profile", verifyToken, profileRoutes);
app.use("/api/postReactions", verifyToken, reactionRoutes);
app.use('/api/comments', verifyToken, commentRoutes);
app.use('/api/conversations', verifyToken, chatRoutes);
app.use("/api/contacts", verifyToken, contactRoutes);
app.use("/api/stories", verifyToken, storyRoutes);
app.use("/api/notifications", verifyToken, notifyRoutes);
app.use("/api/online-status", onlineStatus);

app.use("/api/admin",verifyToken,adminRoutes);

app.post('/upload', upload.single('file'), (req, res) => {
    res.json({
        url: req.file.path, // Cloudinary URL
        filename: req.file.filename
    });
});

setupSocket(server);

server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
