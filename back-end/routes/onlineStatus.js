const express = require('express');
const router = express.Router();
const redis = require("../redisClient"); 

router.get('/count', async (req, res) => {
  try {
    const keys = await redis.keys('user:online:*');
    const count = keys.length;
    res.json({ onlineCount: count });
  } catch (error) {
    console.error('Error counting online users:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const isOnline = await redis.exists(`user:online:${userId}`);
    console.log(userId, "is", isOnline);
    res.json({ userId, online: isOnline === 1 });
  } catch (error) {
    console.error('Error checking online status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
