const express = require('express');
const router = express.Router();
const upload = require('../utils/multer');
const {
  registerUser,
  loginUser,
  updateUser,
  deactivateUser
} = require('../controllers/user');

// User Routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/update', updateUser);
router.delete('/deactivate', deactivateUser);

module.exports = router;