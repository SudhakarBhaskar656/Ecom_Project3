const jwt = require('jsonwebtoken');
const { config } = require('dotenv');
config();

const secretKey = process.env.JWT_SECRET_KEY;

// Middleware to check if user is logged in
exports.UserIsLoggedIn = (req, res, next) => {
    const token = req.query.token || req.cookies.token;

    if (!token) {
        return res.status(401).json({ success: false, message: "You don't have a token. Please sign in to continue." });
    }

    try {
        const data = jwt.verify(token, secretKey);
        req.user = data;
        next();
    } catch (err) {
        console.error('Token verification error:', err);
        return res.status(401).json({ success: false, message: "Invalid token. Please sign in again." });
    }
}

// Middleware to check if admin is logged in
exports.AdminIsLoggedIn = (req, res, next) => {
    const token = req.query.token || req.cookies.token || req.body.token;

    if (!token) {
        return res.status(401).json({ success: false, message: "You don't have a token. Please sign in to continue." });
    }

    try {
        const data = jwt.verify(token, secretKey);
        req.user = data;
        next();
    } catch (err) {
        console.error('Token verification error:', err);
        return res.status(401).json({ success: false, message: "Invalid token. Please sign in again." });
    }
}