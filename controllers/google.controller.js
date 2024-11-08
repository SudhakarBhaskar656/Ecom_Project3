
const userModel = require("../models/user.model");
const bcrypt = require("bcrypt");
const { sendToken } = require("../utils/sendToken");

exports.GoogleLogin = async (req, res) => {
    try {
        // Extract username and email from the Google profile
        const { username, email } = req.user; // Assuming req.user is populated by Passport

        if (!username || !email) {
            return res.status(403).json({ success: false, message: 'Username and email are required' });
        }

        // Check if the user already exists
        let user = await userModel.findOne({ email });

        if (!user) {
            // If user doesn't exist, create a new user with a dummy password and set isAdmin based on req.isAdmin
            const hashedPassword = await bcrypt.hash(process.env.PASSWORD, 10);
            user = await userModel.create({
                username,
                email,
                password: hashedPassword,
                isAdmin: req.isAdmin, // Set isAdmin dynamically based on route
            });
        } else if (user.username !== username) {
            // If user exists but username doesn't match, throw an error
            return res.status(403).json({ success: false, message: 'Username does not match the email' });
        } else if (user.isAdmin !== req.isAdmin) {
            // If user exists but isAdmin status doesn't match, return an error
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        // Send the JWT token as a response to log in the user
        sendToken(user, res); // Assuming sendToken handles token generation and response
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


exports.failureMessage = async (req, res) => {
    try {
        res.status(400).json({ success: false, message: "Google login failed" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
