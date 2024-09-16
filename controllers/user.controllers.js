
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const userModel = require('../models/user.model');
const cartModel = require("../models/cart.model")
const  {sendToken}= require("../utils/sendToken")
const secretKey = process.env.JWT_SECRET_KEY;


// Initialize nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});


// Register new user
exports.registeraccount = async (req, res) => {
    try {
        const { username, email, password, isAdmin = false } = req.body;

        if (await userModel.findOne({ email })) {
            return res.status(403).json({ success: false, message: 'User already registered' });
        }
         
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await userModel.create({ username, email, password: hashedPassword, isAdmin });

        return sendToken(newUser, res);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// User login
exports.loginaccount = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(403).json({ success: false, message: 'Please fill the details' });
        }

        const user = await userModel.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ success: false, message: 'Invalid email or password' });
        }

        return sendToken(user, res);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Google login
exports.loginWithGoogle = async (req, res) => {
    try {
        const { username, email } = req.body;

        if (!username || !email) {
            return res.status(403).json({ success: false, message: 'Username and email are required' });
        }

        let user = await userModel.findOne({ email });

        if (!user) {
            const hashedPassword = await bcrypt.hash('dummyPassword', 10);
            user = await userModel.create({ username, email, password: hashedPassword, isAdmin: false });
        } else if (user.username !== username) {
            return res.status(403).json({ success: false, message: 'Username does not match the email' });
        }

        return sendToken(user, res);
    } catch (error) {
        res.status(500).json({ success: false, message:  error.message});
    }
};


// User logout
exports.logoutaccount = (req, res) => {
   try {
    res.clearCookie('token');
    res.status(200).json({ success: true, message: 'Logout successful' });
   } catch (error) {
      res.status(error).json({success : false, message : error.message})
   }
};


// Send password reset email
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(403).json({ success: false, message: 'Please enter your email address.' });
        }

        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: 'User with this email does not exist.' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpire = Date.now() + 5 * 60 * 1000; // 5 minutes

        await user.save();

        const resetLink = `http://localhost:5173/updatepassword/${token}`;
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset',
            html: `
                <p>Dear User,</p>
                <p>We received a request to reset your Apnamart password. Please click the link below to reset your password:</p>
                <p><a href="${resetLink}" style="color: #007bff; text-decoration: none; font-weight: bold;">Reset your password</a></p>
                <p>This link will expire in 5 minutes. If you did not request this change, please ignore this email.</p>
                <p>Best regards,<br>Apnamart Support Team</p>
            `,
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true, message: 'Password reset link sent to your email.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'An error occurred. Please try again later.' });
    }
};

// Update user password using reset token
exports.updatePassword = async (req, res) => {
    try {
        const { password, confirmPassword, token } = req.body;

        if (!token) {
            return res.status(401).json({ success: false, message: 'Please provide a valid token' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ success: false, message: 'Passwords do not match.' });
        }

        const user = await userModel.findOne({ resetPasswordToken: token, resetPasswordExpire: { $gt: Date.now() } });
        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired token.' });
        }

        user.password = await bcrypt.hash(password, 12);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        res.status(200).json({ success: true, message: 'Password updated successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'An error occurred. Please try again later.' });
    }
};

// Change user password
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const userId = req.user.userid; // Assuming user ID is attached to req.user

        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ success: false, message: 'All fields are required.' });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ success: false, message: 'New passwords do not match.' });
        }

        const user = await userModel.findById(userId);
        if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
        }

        user.password = await bcrypt.hash(newPassword, 12);
        await user.save();

        res.status(200).json({ success: true, message: 'Password updated successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'An error occurred. Please try again later.' });
    }
};



exports.currentUser = async (req, res, next)=>{
    try {
         const user = await userModel.findOne({email : req.user.email})
         if(! user) return res.status(403).json({success : false, message : "User not Found! "})
         res.status(200).json({success : true, user})
    } catch (error) {
         res.status(error.status).json({success : false, message : error.message})
    }
}


exports.getUserProfile = async (req, res) => {
    try {
        // Fetch the logged-in user's email from the request object (assuming JWT middleware adds this)
        const loginUserEmail = req.user.email;

        // Find the user by their email, excluding the password field
        const user = await userModel
            .findOne({ email: loginUserEmail })
            .select('-password') // Exclude the password field
            .populate("mycart")
            .populate("wishlist");

        // If the user is not found, return an error
        if (!user) {
            return res.status(404).json({ success: false, message: "Login User not found" });
        }

        // Send back the user's profile details
        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};
exports.currentUser = async (req, res, next)=>{
    try {
         const user = await userModel.findOne({email : req.user.email})
         if(! user) return res.status(403).json({success : false, message : "User not Found! "})
         res.status(200).json({success : true, user})
    } catch (error) {
         res.status(error.status).json({success : false, message : error.message})
    }
}


exports.getUserProfile = async (req, res) => {
    try {
        // Fetch the logged-in user's email from the request object (assuming JWT middleware adds this)
        const loginUserEmail = req.user.email;

        // Find the user by their email, excluding the password field
        const user = await userModel
            .findOne({ email: loginUserEmail })
            .select('-password') // Exclude the password field
            .populate("mycart")
            .populate("wishlist");

        // If the user is not found, return an error
        if (!user) {
            return res.status(404).json({ success: false, message: "Login User not found" });
        }

        // Send back the user's profile details
        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};



exports.editProfileImage = async (req, res) => {
    try {
      const loginuser = await userModel.findOne({email : req.user.email});
      // Validate that a user ID is provided
      if (! loginuser) {
        return res.status(400).json({ success: false, message: "Login user is required" });
      }
  
      // Find the user by ID
      const user = await userModel.findById(loginuser._id);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
  
      // Ensure that a file was uploaded
      if (!req.file) {
        return res.status(400).json({ success: false, message: "Please upload an image" });
      }
  
      // Update the user's profile image URL with Cloudinary's image URL
      const imageUrl = req.file.path; // Cloudinary automatically provides the URL in `req.file.path`
      // Update the user's profile image in the database
      user.profile = imageUrl;
      await user.save();
  
      // Respond with success message and updated image URL
      res.status(200).json({
        success: true,
        message: 'Profile image updated successfully',
        user
      });

    } catch (error) {
      console.error('Error updating profile image:', error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  };




  exports.checkout = async (req, res) => {
    try {
        // Fetch the cart for the logged-in user
        const cart = await cartModel.findOne({ user: req.user.userid }).populate({
            path: 'items.product',
            select: 'name priceAfterDiscount' // Only populate required fields
        });
        
        // Check if the cart exists
        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found" });
        }

        // Check if the cart has items
        if (cart.items.length === 0) {
            return res.status(400).json({ success: false, message: "Cart is empty" });
        }

        // Calculate the total amount
        let totalAmount = 0;
        const cartItems = cart.items.map(item => {
            const itemTotal = item.product.priceAfterDiscount * item.quantity;
            totalAmount += itemTotal;
            return {
                product: item.product._id,
                name: item.product.name,
                quantity: item.quantity,
                priceAfterDiscount: item.product.priceAfterDiscount,
                itemTotal
            };
        });

        // Respond with the cart details and total amount
        res.status(200).json({
            success: true,
            message: "Cart details fetched successfully",
            cart: {
                items: cartItems,
                totalAmount
            }
        });  
    } catch (error) {
        console.error('Error fetching cart details:', error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};
  
