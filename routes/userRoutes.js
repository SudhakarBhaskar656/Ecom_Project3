
const express = require('express');
const { registeraccount, loginaccount, logoutaccount, shopaccount, adminaccount, loginWithGoogle } = require('../controllers/user.controllers');
const { UserIsLoggedIn } = require('../middlewares/auth.middleware');
const router = express.Router();

//register account
router.post('/register', registeraccount);

//Login account
router.post('/login', loginaccount);

//google/login
router.post('/google/login', loginWithGoogle);

//logout
router.get("/logout",UserIsLoggedIn , logoutaccount)

module.exports = router;