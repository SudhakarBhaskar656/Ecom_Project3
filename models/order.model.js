const mongoose = require('mongoose');


const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, "User is required"],
    },
    products: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: [true, "Product is required"],
        },
        quantity: {
            type: Number,
            required: [true, "Please add the quantity of the product"],
        },
        price: { 
            type: Number,
            required: [true, "Price of the product is mandatory"],
        },
        totalPrice: { 
            type: Number,
            required: [true, "Total price of the product is mandatory"], 
        }
    }],
    totalAmount: {
        type: Number,
        required: [true, "Total order amount is required"],
    },
    orderDate: {
        type: Date,
        default: Date.now,
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
        default: 'pending',
        set: (value) => value.toLowerCase()
    },
    statusHistory: [{
        status: { 
            type: String, 
            enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], 
        },
        date: { type: Date, default: Date.now },
    }],
    paymentMethod: {
        type: String,
        enum: ['razorpay', 'card', 'paypal', 'cash-on-delivery'],
        required: [true, "Please provide a payment method"],
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed'],
        default: 'pending',
    },
    razorpayOrderId: {
        type: String,
        required: [true, "Razorpay order ID is required"],
    },
    razorpayPaymentId: {
        type: String,
    },
    deliveryAddress: {
        addressLine1: {
            type: String,
            required: [true, "Address Line 1 is required"],
            validate: {
                validator: (value) => typeof value === 'string' && value.trim() !== '',
                message: "Address Line 1 must be a non-empty string."
            }
        },
        addressLine2: {
            type: String,
            validate: {
                validator: (value) => typeof value === 'string',
                message: "Address Line 2 must be a string."
            }
        },
        city: {
            type: String,
            required: [true, "City is required"],
            validate: {
                validator: (value) => typeof value === 'string' && value.trim() !== '',
                message: "City must be a non-empty string."
            }
        },
        state: {
            type: String,
            required: [true, "State is required"],
            validate: {
                validator: (value) => typeof value === 'string' && value.trim() !== '',
                message: "State must be a non-empty string."
            }
        },
        postalCode: {
            type: String,
            required: [true, "Postal Code is required"],
            validate: {
                validator: (value) => /^[0-9]{6}$/.test(value),
                message: "Postal Code must be a 6-digit number."
            }
        },
        country: {
            type: String,
            required: [true, "Country is required"],
            validate: {
                validator: (value) => typeof value === 'string' && value.trim() !== '',
                message: "Country must be a non-empty string."
            }
        },
        phoneNumber: {
            type: String,
            required: [true, "Phone Number is required"],
            validate: {
                validator: (value) => /^[0-9]{10}$/.test(value),
                message: "Phone Number must be a 10-digit number."
            }
        }
    },
    deliveryDate: {
        type: Date,
    },
    cancelReason: {
        type: String,
    },
    orderNumber: {
        type: String,
        unique: true,
        required: [true, "Order number is required"],
        default: function() { return `ORD-${Date.now()}`; }, 
    },
    deleted: {
        type: Boolean,
        default: false, 
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Order", orderSchema);
