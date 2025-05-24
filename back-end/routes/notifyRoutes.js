const notifyController = require('../controllers/notifyController');
const express = require('express');
const router = express.Router();
router.get('/', notifyController.getNotificationsByUserId);
router.post('/create', notifyController.createNotify);
router.put('/markAllRead', notifyController.markAsRead);
module.exports = router;