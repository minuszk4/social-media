const User = require('../models/user');
const Post = require('../models/post');
const db = require('../models/db');
async function getAllUsers(req, res) {
    try {
        const users = await User.getAllUsers(req);
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Something went wrong while fetching users' });
    }
}

async function getUserById(req, res) {
    const { id } = req.params;
    try {
        const [user] = await User.getUserById(id);
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Something went wrong while fetching the user' });
    }
}

async function updateUser(req, res) {
    const { id } = req.params;
    const { username, email, password_hash, provider } = req.body;
    try {
        const result = await userModel.updateUser(id, { username, email, password_hash, provider });
        if (result.affectedRows > 0) {
            res.json({ message: 'User updated successfully' });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Something went wrong while updating the user' });
    }
}

async function deleteUser(req, res) {
    const { id } = req.params;
    try {
        const result = await User.deleteUser(id);
        if (result.affectedRows > 0) {
            res.json({ message: 'User deleted successfully' });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Something went wrong while deleting the user' });
    }
}

// **Post CRUD**

async function getAllPosts(req, res) {
    try {
        const posts = await Post.getAllPosts(req,res);
        res.status(200).json(posts);
    } catch (err) {
        res.status(500).json({ error: 'Something went wrong while fetching posts' });
    }
}

async function getPostById(req, res) {
    const { id } = req.params;
    try {
        const [post] = await Post.getPostById(id);
        if (post) {
            res.json(post);
        } else {
            res.status(404).json({ error: 'Post not found' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Something went wrong while fetching the post' });
    }
}


async function deletePost(req, res) {
    const { id } = req.params;
    // console.log(id);
    try {
        const result = await Post.deletePost(id);
        if (result.affectedRows > 0) {
            res.json({ message: 'Post deleted successfully' });
        } else {
            res.status(404).json({ error: 'Post not found' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Something went wrong while deleting the post' });
    }
}
async function dashboard(req, res) {
    try {
        const totalUsers = await User.countUsers();
        const totalPosts = await Post.countPosts();
        res.json({
            totalUsers,
            totalPosts
        });
    } catch (err) {
        console.error('Error fetching dashboard data:', err);
        res.status(500).json({ error: 'Something went wrong while fetching dashboard data' });
    }
}
async function checkAdmin(req, res) {
    try {
        const user = req.user; 
        if (user && user.isAdmin) {
            return res.json({ isAdmin: true });
        } else {
            return res.status(403).json({ isAdmin: false });
        }
    } catch (err) {
        console.error('Error checking admin status:', err);
        res.status(500).json({ error: 'Something went wrong while checking admin status' });
    }
}

async function getAllStories(req, res) {
  const { limit = 10, page = 1 } = req.query;
  try {
    const offset = (page - 1) * limit;
    const sql = `
      SELECT s.story_id, s.user_id, sm.media_url, s.created_at, up.full_name, up.avatar_url
      FROM Stories s
      JOIN StoryMedia sm ON s.story_id = sm.story_id
      JOIN UserProfiles up ON up.user_id = s.user_id
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const [stories] = await db.query(sql, [parseInt(limit), parseInt(offset)]);
    res.json(stories);
  } catch (error) {
    console.error("Error fetching stories:", error);
    res.status(500).json({ message: "Server error!" });
  }
}

module.exports = {
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    getAllPosts,
    getPostById,
    deletePost,
    dashboard,  
    checkAdmin,
    getAllStories
};
