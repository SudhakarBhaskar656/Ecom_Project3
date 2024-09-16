const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  rating: {
    type: Number,
    required: [true, "Rating is required"],
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: [true, "Comment is required"],
    trim: true,
  }
}, { timestamps: true });

module.exports = mongoose.model("Review", reviewSchema);
