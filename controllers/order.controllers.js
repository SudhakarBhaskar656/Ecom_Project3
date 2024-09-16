const Order = require('../models/order.model'); // Assuming the model is named 'order.model.js'
const User = require('../models/user.model');
const Product = require('../models/product.model');
const nodemailer = require("nodemailer");
const userModel = require('../models/user.model');



exports.createOrder = async (req, res) => {
    try {
        const { products, totalAmount, deliveryAddress, paymentMethod } = req.body;

        // Ensure products exist
        if (!products || products.length === 0) {
            return res.status(400).json({ message: "No products found in the order" });
        }
        const loginuser = await userModel.findOne({ email: req.user.email })
        // Ensure the user is logged in
        if (!loginuser._id) {
            return res.status(400).json({ message: "User is required" });
        }

        // Fetch product details using the product IDs and populate the fields (e.g., name, price)
        const populatedProducts = await Promise.all(products.map(async (item) => {
            const product = await Product.findById(item.product).select('name price'); // You can select more fields as needed
            if (!product) {
                throw new Error(`Product with ID ${item.product} not found`);
            }
            return {
                product: product._id,
                name: product.name,
                price: product.price,
                quantity: item.quantity
            };
        }));

        // Validate the fetched product prices
        for (const product of populatedProducts) {
            if (!product.price) {
                return res.status(400).json({ message: "Each product must include a price" });
            }
        }

        // Create the new order
        const newOrder = new Order({
            user: loginuser._id,
            products: populatedProducts,
            totalAmount,
            deliveryAddress,
            paymentMethod
        });

        await newOrder.save();
        loginuser.orders.push(newOrder._id);
        await loginuser.save();

        // Create a transporter object for sending the confirmation email
        const transporter = nodemailer.createTransport({
            service: 'gmail', // Can use another provider like Yahoo, Outlook, etc.
            auth: {
                user: process.env.EMAIL_USER, // Your email address from env variables
                pass: process.env.EMAIL_PASS // Your email password from env variables
            }
        });

        // Define the email content
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: req.user.email,
            subject: 'Order Confirmation - Your Order has been Successfully Placed!',
            text: `Dear customer,

            Thank you for shopping with us!

            Your order has been successfully placed. Below are the details:

            Order ID: ${newOrder._id}
            Total Amount: $${newOrder.totalAmount}
            Delivery Address: 
           ${newOrder.deliveryAddress.street}, 
           ${newOrder.deliveryAddress.city}, 
           ${newOrder.deliveryAddress.state}, 
           ${newOrder.deliveryAddress.postalCode}, 
           ${newOrder.deliveryAddress.country}

           We will notify you once your order is shipped.

           Thank you for your trust in us!

           Best Regards,
           As ItSolutions`
            }; 

        // Send the confirmation email
        await transporter.sendMail(mailOptions);

        // Respond with order creation success
        res.status(201).json({ message: 'Order created successfully and confirmation email sent', order: newOrder });

    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ message: 'Error creating order', error: error.message });
    }
};


// Get all orders for a logged-in user
exports.getUserOrders = async (req, res) => {
    try {
        const loginuser = await userModel.findOne({email : req.user.email})
        
        const orders = await Order.find({ user: loginuser._id}).populate('products.product');
        if (orders.length === 0) {
            return res.status(404).json({ message: "No orders found" });
        }
        res.status(200).json({ message: 'User orders fetched successfully', orders });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user orders', error: error.message });
    }
};

// Get a single order by order ID
exports.getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId).populate('products.product');
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        res.status(200).json({ message: 'Order fetched successfully', order });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching order', error: error.message });
    }
};

// Update order status (for Admin)
exports.updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findById(req.params.orderId);

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        
        order.status = status;
        if (status === 'cancelled') {
            order.cancelReason = req.body.cancelReason || 'No reason provided';
        }

        await order.save();
        res.status(200).json({ message: 'Order status updated successfully', order });
    } catch (error) {
        res.status(500).json({ message: 'Error updating order status', error: error.message });
    }
};

// Cancel an order (for Users)
exports.cancelOrder = async (req, res) => {
    try {
        // Fetch the order by ID
        const order = await Order.findById(req.params.orderId);

        // Check if the order exists
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Check if the user is authorized to cancel the order
        const loginuser = await userModel.findOne({email : req.user.email})
        if (! loginuser._id) {
            return res.status(403).json({ message: 'You are not authorized to cancel this order' });
        }

        // Update the order status to 'cancelled' and add the cancellation reason
        order.status = 'cancelled';
        order.cancelReason = req.body.cancelReason || 'No reason provided';

        // Save the updated order
        await order.save();

        // Remove the order from the Order model (deleting the order)
        await Order.findByIdAndDelete(req.params.orderId);

        // Remove the order from the user's orders array
        loginuser.orders = loginuser.orders.filter(orderId => orderId.toString() !== req.params.orderId.toString());
        await loginuser.save();

        // Respond with success
        res.status(200).json({ message: 'Order cancelled and removed successfully', order });

    } catch (error) {
        res.status(500).json({ message: 'Error cancelling order', error: error.message });
    }
};



