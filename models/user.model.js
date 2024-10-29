
const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
    username: {
      type: String,
      trim: true,
      required: [true, "username is required"],
      unique: [true, "username must be unique"],
      minLength: [3, "username must be at least 3 characters"],
    },
    profile: {
      type: String,
      default: `default.jpg`
    },
    email: {
      type: String,
      lowercase: true,
      required: [true, "email is required "],
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
    },
    password: {
      type: String,
      required: true,
      trim: true
    },
    isAdmin: {
      type: Boolean,
      default: false
    },
    mycart: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    }],
    wishlist: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    }],
    orders: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    }],
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    dob: {
      type: String,
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
    },
    mobileNumber: {
      type: String,
      match: [/^\d{10}$/, "Please enter a valid 10-digit mobile number"],
    },
    addresses: [{
      _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
      addressLine1: { type: String, required: true },
      addressLine2: { type: String },
      city: { type: String, required: true },
      state: { type: String, required: true },
      postalCode: { type: String, required: true, match: [/^\d{6}$/, "Please enter a valid 6-digit postal code"] },
      country: { type: String, required: true },
      phoneNumber: { type: String, required: true, match: [/^\d{10}$/, "Please enter a valid 10-digit mobile number"] },
    }],
  
  }, { timestamps: true });
  
  module.exports = mongoose.model("User", userSchema);
  
