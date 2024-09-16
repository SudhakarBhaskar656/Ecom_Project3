<<<<<<< HEAD
=======
<<<<<<< HEAD
=======

>>>>>>> 7c0e93e00febba9ffe22a2756a329814e09d5ac2
>>>>>>> a510549819e888a1e067be7bc5decd95b76f1591
const mongoose = require('mongoose');

// Order schema to keep track of orders
const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Reference to the user who placed the order
        required: [true, "user is required"],
    },
    products: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: [true, "product is required"],
        },
        quantity: {
            type: Number,
            required: [true, "please add quantity of the products"],
        },
        price: { 
            type: Number,
            required: [true, "price of the products is mandatory"], // Capture price at the time of order
        }
    }],
    totalAmount: {
        type: Number,
        required: true,
    },
    orderDate: {
        type: Date,
        default: Date.now,
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
        default: 'pending',
    },
    paymentMethod: {
        type: String,
        enum: ['card', 'paypal', 'cash-on-delivery'],
        required: [true, "Please provide payment method"],
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed'],
        default: 'pending',
    },
    deliveryAddress: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        postalCode: { type: String, required: true },
        country: { type: String, required: true },
    },
    deliveryDate: {
        type: Date,
    },
    cancelReason: {
        type: String, 
        // Reason if the order is cancelled
    }
}, {
    timestamps: true // Automatically adds createdAt and updatedAt fields
});

<<<<<<< HEAD
=======


<<<<<<< HEAD
>>>>>>> a510549819e888a1e067be7bc5decd95b76f1591
module.exports = mongoose.model("Order", orderSchema);
=======
module.exports = mongoose.model("Order", orderSchema);
>>>>>>> 7c0e93e00febba9ffe22a2756a329814e09d5ac2
