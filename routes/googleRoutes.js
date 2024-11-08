const express = require("express");
const router = express.Router();
const passport = require("passport");
const { failureMessage, GoogleLogin } = require("../controllers/google.controller");

// User Google OAuth login
router.get('/auth/google/user', (req, res, next) => {
    req.isAdmin = false; // Set to false for users
    passport.authenticate("google", { scope: ['profile', 'email'] })(req, res, next);
});

// User Google OAuth callback
router.get(
    '/auth/google/callback/user',
    passport.authenticate("google", { failureRedirect: '/failure' }),
    GoogleLogin // Use the GoogleLogin controller to handle the response
);

// Admin Google OAuth login
router.get('/auth/google/admin', (req, res, next) => {
    req.isAdmin = true; // Set to true for admins
    passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

// Admin Google OAuth callback
router.get(
    '/auth/google/callback/admin',
    passport.authenticate('google', { failureRedirect: '/failure' }),
    GoogleLogin // Use the GoogleLogin controller to handle the response
);

// Failure route
router.get("/failure", failureMessage);


module.exports = router;
