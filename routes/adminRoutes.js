const express = require('express');
const router = express.Router();
const { adminregister, adminlogin, adminloginWithGoogle, adminlogout, admindashboard, forgotPassword, updatePassword, changePassword } = require('../controllers/admin.controllers');
const {AdminIsLoggedIn} = require("../middlewares/auth.middleware")


// /register
router.post("/register",   adminregister)

// /login
router.post("/login", adminlogin)

// /google/login
router.post("/google/login", adminloginWithGoogle)

//  /logout
router.get("/logout",AdminIsLoggedIn, adminlogout)

//admin/dashboard
router.get('/admin/dashboard', AdminIsLoggedIn, admindashboard);

// /forgotpassword
router.post('/forgotpassword',  forgotPassword);

// /updatepassword/token
router.put('/updatepassword/:token', updatePassword);

// /resetpassword
router.put("/resetpassword", AdminIsLoggedIn, changePassword);



module.exports = router;