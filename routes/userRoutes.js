
const express = require('express');
const { registeraccount, loginaccount, logoutaccount, forgotPassword, updatePassword, changePassword, currentUser, getUserProfile, updateDetails, editProfile, checkout, addAddress, subscribe, contactUs, loginWithGoogle} = require('../controllers/user.controllers');
const { UserIsLoggedIn } = require('../middlewares/auth.middleware');
const upload = require("../utils/multer");
const router = express.Router();


//register account
// tested
router.post('/register', registeraccount);

//Login account
// tested 
router.post('/login', loginaccount);

//google/login
// tested
router.post('/google/login', loginWithGoogle);


//logout
// tested
router.get("/logout", UserIsLoggedIn, logoutaccount)

// /forgotpassword
// tested
router.post('/forgotpassword', forgotPassword);

// /updatepassword
// tested
router.put('/updatepassword', updatePassword);

// /resetpassword
// tested
router.put("/resetpassword", UserIsLoggedIn, changePassword);

// /currentuser 
// tested
router.get("/currentuser", UserIsLoggedIn, currentUser)

///profile
// tested
router.get("/profile", UserIsLoggedIn, getUserProfile);


// /edit/user
// tested
router.put("/edit/user", UserIsLoggedIn, updateDetails);


// /edit/profile
// tested
router.put("/edit/profile", [UserIsLoggedIn, upload.single("image")], editProfile)

// /checkout
// tested
router.get("/checkout", UserIsLoggedIn, checkout);

// /checkout/add/address
// tested
router.post("/checkout/add/address", UserIsLoggedIn, addAddress);

// /subscribe 
router.post("/subscribe",  subscribe)

// /contacts/message
router.post("/contacts/message", contactUs )



module.exports = router;