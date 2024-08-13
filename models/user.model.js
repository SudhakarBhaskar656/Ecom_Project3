
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        trim: true,
        required: [true, "username is required"],
        unique: [true, "username must be unique"],
        minLength: [3, "username must be at least 3 characters"],
    },
    email: {
        type: String,
        lowercase: true,
        required: [true, "email is required "],
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
    },
    password: {
        type: String,
        required: [true, "Password is required"],
        minLength: [3, "password must be at least 3 characters"],
    },
    isAdmin: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);