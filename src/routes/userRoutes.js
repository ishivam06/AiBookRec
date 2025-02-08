const express = require('express');
const { registerUser, loginUser, getUserProfile } = require('../controllers/userController.js');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile',protect, getUserProfile); // Protected route placeholder

module.exports = router;
