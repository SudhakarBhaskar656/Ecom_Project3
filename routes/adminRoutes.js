const express = require('express');
const router = express.Router();
const {AdminIsLoggedIn} = require("../middlewares/auth.middleware");
const { adminRegister, adminLogin, adminloginWithGoogle, adminLogout, admindashboard, forgotPassword, updatePassword, changePassword } = require('../controllers/admin.controllers');


// /register
router.post("/register",   adminRegister)

// /login
router.post("/login", adminLogin)

// /google/login
router.post("/google/login", adminloginWithGoogle)

//  /logout
router.get("/logout",AdminIsLoggedIn, adminLogout)

// /dashboard
router.get('/dashboard', AdminIsLoggedIn, admindashboard);

// /forgotpassword
router.post('/forgotpassword',  forgotPassword);

// /updatepassword/token
router.put('/updatepassword/:token', updatePassword);

// /resetpassword
router.put("/resetpassword", AdminIsLoggedIn, changePassword);



module.exports = router;