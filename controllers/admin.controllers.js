
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userModel = require('../models/user.model');
const secretKey = process.env.JWT_SECRET_KEY;

exports.adminregister = async (req, res) => {
    try {
        const { username, email, password} = req.body;

        const user = await userModel.findOne({ email });
        if (user) {
            return res.status(403).json({ success: false, message: "Admin already registered" });
        }
      
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        if (!secretKey) {
            throw new Error('JWT_SECRET_KEY environment variable is not set');
        }

        const newUser = await userModel.create({
            username,
            email,
            password: hashedPassword,
            isAdmin: true
        });

        const token = jwt.sign({ email: newUser.email, userid: newUser._id, isAdmin: newUser.isAdmin },
            secretKey, { algorithm: 'HS256', expiresIn: '1h' }
        );

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });

        res.status(200).json({ success: true, newUser, token });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.adminlogin = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(403).json({ success: false, message: "Please fill the details" });
    }
    
    try {
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: "Admin not registered, please register to login" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Invalid email or password" });
        }

        const token = jwt.sign({ email: user.email, userid: user._id, isAdmin: user.isAdmin }, secretKey, { expiresIn: '1h' });

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });

        res.status(200).json({ success: true, user, token });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};





exports.adminloginWithGoogle = async (req, res, next) => {
    try {
        const { username, email } = req.body;

        if (!username) {
            return res.status(403).json({ success: false, message: "Username is not provided" });
        }

        if (!email) {
            return res.status(403).json({ success: false, message: "Email is not provided" });
        }

        // Check if a user exists with the provided email
        let user = await userModel.findOne({ email });
        
        if (!user) {
            // Register new user
            const salt = await bcrypt.genSalt(10);
            const password = await bcrypt.hash("dummyPassword", salt); // Use a placeholder password

            user = await userModel.create({
                username,
                email,
                password,
                isAdmin: true
            });

            // Create a token for the new user
            const token = jwt.sign(
                { email: user.email, userid: user._id, isAdmin: user.isAdmin },
                secretKey,
                { expiresIn: '1h' }
            );

            // Set the token in a cookie
            res.cookie("token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict'
            });

            return res.status(200).json({ success: true, user, token });
        } else {
            // If user exists, check if the username matches
            if (user.username === username && user.email === email) {
                // Create a token for the existing user
                const token = jwt.sign(
                    { email: user.email, userid: user._id, isAdmin: user.isAdmin },
                    secretKey,
                    { expiresIn: '1h' }
                );

                // Set the token in a cookie
                res.cookie("token", token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict'
                });

                return res.status(200).json({ success: true, user, token });
            } else {
                return res.status(403).json({ success: false, message: "Username does not match the email" });
            }
        }

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
}



exports.adminlogout = (req, res) => {
    res.clearCookie("token");
    res.status(200).json({ success: true, message: "Logout successful" });
};



exports.admindashboard = async (req, res) => {
    const user = await userModel.findOne({ email: req.user.email });
    res.status(200).json({success:true, message : "Admin Dashboard successfully", user})
}