
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const userModel = require('../models/user.model');
const cartModel = require("../models/cart.model")
const { sendToken } = require("../utils/sendToken")
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
        res.status(500).json({ success: false, message: error.message });
    }
};

  

// User logout
exports.logoutaccount = (req, res) => {
    try {
        res.clearCookie('token');
        res.status(200).json({ success: true, message: 'Logout successful' });
    } catch (error) {
        res.status(error).json({ success: false, message: error.message })
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

// current user 
exports.currentUser = async (req, res, next) => {
    try {
        const user = await userModel.findOne({ email: req.user.email })
        if (!user) return res.status(403).json({ success: false, message: "User not Found! " })
        res.status(200).json({ success: true, user })
    } catch (error) {
        res.status(error.status).json({ success: false, message: error.message })
    }
}

// getUserProfile
exports.getUserProfile = async (req, res) => {
    try {
      // Fetch the logged-in user's email from the request object (assuming JWT middleware adds this)
      const loginUserEmail = req.user.email;
  
      // Find the user by their email, excluding the password field and populating references
      const user = await userModel
        .findOne({ email: loginUserEmail })
        .select('-password') // Exclude the password field
        .populate("mycart") // Populate the 'mycart' field if it's a reference
        .populate("wishlist"); // Populate the 'wishlist' field if it's a reference
  
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
      console.error("Error fetching user profile:", error); // Log the error for debugging
      res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
  };
  
// updateDetails
  exports.updateDetails = async (req, res, next) => {
    try {
        const { dob, gender, mobileNumber } = req.body;

        // Check if the user ID is provided in the request (assuming user ID is passed in req.user.id)
        const userId = await userModel.findById({_id : req.user.userid})
        if (!userId) {
            return res.status(400).json({ success: false, message: "User ID not found" });
        }

        if(! dob || !gender || !mobileNumber){
            return res.status(400).json({success: false, message : "Please provide  details to update."})
        }

        // Validate and update fields
        const updatedUser = await userModel.findByIdAndUpdate(
            userId,
            { 
                dob, 
                gender, 
                mobileNumber,
            },
            { new: true, runValidators: true } 
        );

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.status(200).json({
            success: true,
            message: "User details updated successfully",
            user: updatedUser
        });
    } catch (error) {
        console.error("Error updating user details:", error);
        res.status(500).json({
            success: false,
            message: "Server error. Please try again later.",
            error: error.message
        });
    }
};


// editProfile
exports.editProfile = async (req, res, next)=>{
    try {
         const loginuser = await userModel.findOne({_id:req.user.userid})
         if(! loginuser){
            res.status(403).json({success:false, message : "Loginuser not found"})
         }
         if(!req.file.path){
            res.status(403).json({success:false, message : "Please provide path for image"})
         }
        loginuser.profile = req.file.path;
        await loginuser.save();
        res.status(200).json({success:true, message:"Profile Update Successfully.", loginuser})
    } catch (error) {
         res.status(500).json({success:false, message: error.message})
    }
}

// checkout page api for login user after adding the carts in the list to but the products 
exports.checkout = async (req, res) => {
    try {
      // Fetch the user and cart for the logged-in user
      const userId = req.user && req.user.userid;
      if (!userId) {
        return res.status(401).json({ success: false, message: "User not authenticated" });
      }
  
      const user = await userModel.findById(userId);
      const cart = await cartModel.findOne({ user: userId }).populate({
        path: 'items.product',
        select: 'name priceAfterDiscount images',

      });
  
      if (!cart) {
        return res.status(404).json({ success: false, message: "User does not have any products in the cart." });
      }
  
      if (!cart.items || cart.items.length === 0) {
        return res.status(400).json({ success: false, message: "Cart is empty, please add products in the cart" });
      }
  
      // Check if user has an address
      if (!user.addresses || user.addresses.length === 0) {
        return res.status(200).json({
          success: true,
          message: "User has no address. Please add an address to proceed with the checkout.",
          cart: {
            items: cart.items,
            totalAmount: calculateTotalAmount(cart.items),
          },
          addresses: user.addresses // Will be empty here
        });
      }
  
      // Helper function to calculate total amount
  function calculateTotalAmount(cartItems) {
    return cartItems.reduce((total, item) => {
      const { product, quantity } = item;
      return product && product.priceAfterDiscount ? total + product.priceAfterDiscount * quantity : total;
    }, 0);
  }

      // If user has addresses, list them along with the cart details
      const totalAmount = calculateTotalAmount(cart.items);
      res.status(200).json({
        success: true,
        message: "Checkout details fetched successfully",
        cart: {
          items: cart.items,
          totalAmount
        },
        addresses: user.addresses, // List of saved addresses
      });
    } catch (error) {
      res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
  };
  

// Add a new address for the user
exports.addAddress = async (req, res) => {
    try {
      const userId = req.user && req.user.userid;
      if (!userId) {
        return res.status(401).json({ success: false, message: "User not authenticated" });
      }
  
      const { addressLine1, addressLine2, city, state, postalCode, country, phoneNumber } = req.body;
  
      if (!addressLine1 || !city || !state || !postalCode || !country || !phoneNumber) {
        return res.status(400).json({ success: false, message: "Please provide all required address fields" });
      }
  
      // Validate the postal code and phone number
      const postalCodeRegex = /^\d{6}$/;
      const phoneNumberRegex = /^\d{10}$/;
      if (!postalCodeRegex.test(postalCode)) {
        return res.status(400).json({ success: false, message: "Invalid postal code" });
      }
      if (!phoneNumberRegex.test(phoneNumber)) {
        return res.status(400).json({ success: false, message: "Invalid phone number" });
      }
  
      // Find the user and add the new address
      const user = await userModel.findById(userId);
      const newAddress = {
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode,
        country,
        phoneNumber
      };
  
      user.addresses.push(newAddress);
      await user.save();
  
      res.status(201).json({ success: true, message: "Address added successfully", addresses: user.addresses });
    } catch (error) {
      console.error('Error adding address:', error);
      res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
  };
  

// subscribe to the service updates
  exports.subscribe = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(403).json({ success: false, message: 'Please enter your email address.' });
        }
       
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Subscription Confirmation',
            html: `
                <p>Dear Valued Customer,</p>
                <p>We are pleased to inform you that your subscription has been successfully activated. You will now receive exclusive updates on our latest products, special promotions, and important announcements directly to your inbox.</p>
                <p>We appreciate your interest in our services and look forward to keeping you informed.</p>
                <p>Thank you for choosing us!</p>
                <p>Best regards,<br>Apnamart Support Team</p>
            `,
        };
       
        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true, message: 'You have successfully subscribed to our updates.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'An error occurred. Please try again later.' });
    }
  };


  // Contact Us Controller
  exports.contactUs = async (req, res) => {
    try {
        const { name, email, phoneNumber, comment } = req.body;

        // Validate input
        if (!name || !email || !comment || !phoneNumber) {
            return res.status(400).json({ success: false, message: 'Name, email, phone number, and comment are required.' });
        }

        // Prepare email content
        const mailOptions = {
            from: email, 
            to: process.env.EMAIL_USER, 
            subject: 'New Message from Customer',
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <h2 style="color: #007bff;">New Message from Customer</h2>
                    <p style="font-size: 16px;">You have received a new message from a customer:</p>
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Phone Number:</strong> ${phoneNumber}</p>
                    <p><strong>Comment:</strong> ${comment}</p>
                    <p style="font-size: 14px; color: #777;">Best regards,<br>Apnamart Support Team</p>
                </div>
            `,
        };

        // Send email
        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true, message: 'Your message has been sent successfully. We will get back to you shortly.' });
    } catch (error) {
        console.error('Error sending contact email:', error);
        res.status(500).json({ success: false, message: 'An error occurred while sending your message. Please try again later.' });
    }
  };




  
  

