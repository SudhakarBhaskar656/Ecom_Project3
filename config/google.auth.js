const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const userModel = require("../models/user.model");
const bcrypt = require('bcrypt');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback',
    passReqToCallback: true
}, async (req, accessToken, refreshToken, profile, done) => {
    try {
        // Extract username and email from the profile
        const username = profile.displayName; // Display name as username
        const email = profile.emails[0].value; // Get email from the profile
        const isAdmin = req.isAdmin || false; // Check if the request is for an admin

        // Check if the user already exists in the database
        let user = await userModel.findOne({ email });

        if (!user) {
            // If the user doesn't exist, create a new user with a dummy password
            const hashedPassword = await bcrypt.hash(process.env.PASSWORD, 10);
            user = await userModel.create({
                username,
                email,
                password: hashedPassword,
                isAdmin, // Set isAdmin based on the request
            });
        } else if (user.username !== username) {
            // If the username doesn't match, return an error
            return done(new Error('Username does not match the email'), null);
        } else if (user.isAdmin !== isAdmin) {
            // If user role does not match, return an error
            return done(new Error('Access denied'), null);
        }

        // Set email and username in req.user object
        req.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            isAdmin: user.isAdmin
        };

        // Successfully authenticated
        done(null, user);
    } catch (error) {
        done(error, null);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await userModel.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});
