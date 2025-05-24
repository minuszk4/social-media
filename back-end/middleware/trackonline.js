const redis = require("../redisClient")

module.exports = async function trackOnline(req, res, next) {
  const userId = req.query.user_id; 
  console.log(userId);
  if (userId) {
    console.log(userId);
    await redis.set(`user:online:${userId}`, 1, 'EX', 300); 
  }
  next();
};
