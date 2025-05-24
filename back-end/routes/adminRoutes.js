const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const verifyToken = require('../middleware/authMiddleware');
const requireAdmin = (req, res, next) => {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};
// **User Routes**
router.get('/users',requireAdmin, adminController.getAllUsers);
router.get('/users/:id',requireAdmin, adminController.getUserById);
router.put('/users/:id',requireAdmin, adminController.updateUser);
router.delete('/users/:id',requireAdmin, adminController.deleteUser);

// **Post Routes**
router.get('/posts',requireAdmin, adminController.getAllPosts);
router.get('/posts/:id',requireAdmin, adminController.getPostById);
router.delete('/posts/:id',requireAdmin, adminController.deletePost);
router.get('/check',requireAdmin,adminController.checkAdmin); // Thêm route để kiểm tra quyền admin
router.get('/dashboard', requireAdmin,adminController.dashboard);  // Thêm route cho Dashboard

//storie routes
router.get('/stories', requireAdmin, adminController.getAllStories);

module.exports = router;
