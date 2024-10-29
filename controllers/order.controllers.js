const Order = require('../models/order.model'); // Assuming the model is named 'order.model.js'
const User = require('../models/user.model');
const Product = require('../models/product.model');
const nodemailer = require("nodemailer");
const userModel = require('../models/user.model');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const mongoose = require("mongoose")
const PDFDocument = require('pdfkit');
const NodeCache = require("node-cache");
const myCache = new NodeCache({ stdTTL: 100, checkperiod: 120 });



// create order 
exports.createOrder = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    let paymentStatus; // Declare paymentStatus variable
    try {
        const { products, deliveryAddress, userEmail } = req.body;

        // Validate that products array exists and is not empty
        if (!products || products.length === 0) {
            return res.status(400).json({ message: "No products found in the order" });
        }

        const loginuser = await userModel.findOne({ email: req.user.email }).session(session);
        if (!loginuser) {
            return res.status(400).json({ message: "User not found" });
        }

        // Validate that delivery address is provided
        if (!deliveryAddress) {
            return res.status(400).json({ message: "Delivery address is required" });
        }

        // Fetch product details from the database
        const populatedProducts = await Promise.all(
            products.map(async item => {
                const product = await Product.findById(item.product._id).select('name price priceAfterDiscount stock').session(session);
                if (!product) {
                    throw new Error(`Product with ID ${item.product._id} not found`);
                }
                if (product.stock < item.quantity) {
                    throw new Error(`Insufficient stock for product ID ${item.product._id}`);
                }
                const totalPrice = product.priceAfterDiscount * item.quantity; // Calculate total price for the product
                
                // Reduce stock by the quantity ordered
                product.stock -= item.quantity;
                await product.save({ session });

                return {
                    product: product._id,
                    name: product.name,
                    price: product.priceAfterDiscount,
                    quantity: item.quantity,
                    totalPrice: totalPrice
                };
            })
        );

        // Calculate total amount in INR
        const totalAmount = populatedProducts.reduce((acc, product) => acc + product.totalPrice, 0);

        // Convert the total amount to paise and ensure it is an integer
        const amountInPaise = Math.round(totalAmount * 100);

        // Create Razorpay order
        const razorpayOrder = await new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        }).orders.create({
            amount: amountInPaise, // Razorpay requires the amount in paise
            currency: 'INR',
            receipt: `ORD-${Date.now()}`,
        });

        // Create a new order document with populated product details and Razorpay order ID
        const newOrder = new Order({
            user: loginuser._id,
            products: populatedProducts,
            totalAmount: totalAmount,
            deliveryAddress,
            paymentMethod: 'razorpay',
            razorpayOrderId: razorpayOrder.id, // Set Razorpay order ID here
            orderNumber: `ORD-${Date.now()}`, // Generate order number
            paymentStatus: 'pending' // Set initial payment status to 'pending'
        });

        // Save the order to the database
        await newOrder.save({ session });
        loginuser.orders.push(newOrder._id);
        await loginuser.save({ session });

        // Send confirmation email to the user
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: userEmail || req.user.email,
            subject: 'Order Confirmation - Your Order has been Placed!',
            html: `
                <h1>Thank you for your order!</h1>
                <p>Your order has been successfully placed. Here are the details:</p>
                <p><strong>Order ID:</strong> ${newOrder._id}</p>
                <p><strong>Total Amount:</strong> ₹${totalAmount}</p>
                <h2>Products:</h2>
                <ul>
                    ${populatedProducts.map(product => `
                        <li>${product.name} - Quantity: ${product.quantity} - Price: ₹${product.price} - Total Price: ₹${product.totalPrice}</li>
                    `).join('')}
                </ul>
                <p>We will notify you once your order is shipped.</p>
                <p>Thank you for shopping with us!</p>
            `,
        };

        await transporter.sendMail(mailOptions);

        // Update payment status to 'paid' after successful transaction
        paymentStatus = 'paid';
        newOrder.paymentStatus = paymentStatus; // Update payment status in the order

        // Respond with the newly created order details
        res.status(201).json({
            message: 'Order created successfully',
            order: newOrder,
            razorpayOrderId: razorpayOrder.id,
        });

        // Commit the transaction
        await session.commitTransaction();
    } catch (error) {
        // Abort the transaction in case of an error
        await session.abortTransaction();
        // Set payment status to 'failed' if an error occurs
        if (paymentStatus !== 'paid') {
            newOrder.paymentStatus = 'failed';
            await newOrder.save({ session });
        }
        res.status(500).json({ message: 'Error creating order', error: error.message });
    } finally {
        session.endSession();
    }
};


// Get all orders for a logged-in user
exports.getUserOrders = async (req, res) => {
    try {
        const userEmail = req.user.email;

        // Create a cache key based on the user's email
        const cacheKey = `orders_${userEmail}`;

        // Check if orders data exists in the cache
        const cachedOrders = myCache.get(cacheKey);
        if (cachedOrders) {
            return res.status(200).json({ message: 'User orders fetched successfully', orders: cachedOrders }); // Return cached response
        }

        // Find the user by email
        const loginuser = await userModel.findOne({ email: userEmail });
        if (!loginuser) {
            return res.status(404).json({ message: "User not found" });
        }

        // Find the user's orders and populate the product details
        const orders = await Order.find({ user: loginuser._id }).populate('products.product');
        if (orders.length === 0) {
            return res.status(404).json({ message: "No orders found" });
        }

        // Store the orders in the cache
        myCache.set(cacheKey, orders);

        // Send the response with the user's orders
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
    const { status, userEmail } = req.body; 
    const order = await Order.findById(req.params.orderId || req.query.orderId);
      
    if (!order) {
        return res.status(404).json({ message: "Order not found" });
    }
    if (!status) {
        return res.status(403).json({ success: false, message: "Please provide status for update" });
    }

    order.status = status;
   
    await order.save();
    // Send email notification to the user about the order status update
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: userEmail || req.user.email,
        subject: 'Order Status Update',
        html: `
            <h1>Your Order Status has been Updated</h1>
            <p>Dear Customer,</p>
            <p>Your order status has been updated to: <strong>${status}</strong>.</p>
            <p>If you have any questions, feel free to contact us.</p>
            <p>Thank you for choosing us!</p>
        `,
    };

    await transporter.sendMail(mailOptions);
    
    res.status(200).json({ message: 'Order status updated successfully', order });
};


// Cancel an order (for Users)
exports.cancelOrder = async (req, res) => {
    try {
        // Validate the order ID format
        const orderId = req.params.orderId || req.query.orderId;
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({ message: "Invalid order ID format" });
        }
          
        // Fetch the order by ID
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        
        let {cancelReason} = req.body;

        // Check if the user is authorized to cancel the order
        const loginuser = await userModel.findOne({ email: req.user.email });
        if (!loginuser || !loginuser._id) {
            return res.status(403).json({ message: 'You are not authorized to cancel this order' });
        }
        
        // Ensure cancellation reason is provided
        if (!cancelReason) {
            return res.status(403).json({ success: false, message: "Please provide a reason for cancellation" });
        }

        // Update the order status to 'cancelled' and save the reason
        order.status = 'cancelled';
        order.cancelReason = req.body.cancelReason;
        await order.save();
        
        // Remove the order from the Order model
        await Order.findByIdAndDelete(orderId);
      
        // Update the user's orders array
        loginuser.orders = loginuser.orders.filter(id => id.toString() !== orderId.toString());
        await loginuser.save();

        // Send email notification about the order cancellation
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: req.body.userEmail || req.user.email,
            subject: 'Order Cancellation Confirmation',
            html: `
                <h1 style="color: red;">Your Order Has Been Cancelled</h1>
                <p>Dear Customer,</p>
                <p>We regret to inform you that your order has been cancelled.</p>
                <p><strong>Cancellation Reason:</strong> ${order.cancelReason}</p>
                <p>If you have any questions or concerns, please do not hesitate to contact us.</p>
                <p>Thank you for your understanding.</p>
            `,
        };

        await transporter.sendMail(mailOptions);

        // Respond with success
        res.status(200).json({ message: 'Order cancelled and removed successfully' });

    } catch (error) {
        res.status(500).json({ message: 'Error cancelling order', error: error.message });
    }
};



exports.generateInvoice = async (req, res) => {
    try {
      const order = await Order.findById(req.params.orderId)
        .populate('user')
        .populate('products.product');
          
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
  
      // Create a new PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50
      });
  
      // Set response headers for file download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderNumber}.pdf`);
  
      // Pipe the PDF document to the response
      doc.pipe(res);
  
      // Helper function to draw a line
      const drawLine = (y) => {
        doc.moveTo(50, y).lineTo(550, y).stroke();
      };
  
      // Add content to the PDF
      doc.fontSize(20).text('Invoice', { align: 'center' });
      doc.moveDown();
  
      // Company details
      doc.fontSize(12).text('Apna Mart', { align: 'left' });
      doc.fontSize(10).text('D55 Bda Colony, Kohefiza, Bhopal, India', { align: 'left' });
      doc.text('Phone: +91 7000922141', { align: 'left' });
      
      // Order details (right-aligned)
      doc.fontSize(10).text(`Order Number: ${order.orderNumber}`, { align: 'right' });
      doc.text(`Order Date: ${order.orderDate.toDateString()}`, { align: 'right' });
      doc.text(`Status: ${order.status}`, { align: 'right' });
      
      drawLine(doc.y + 10);
      doc.moveDown();
      doc.moveDown();
    
      // Customer details
      doc.fontSize(12).text('Bill To:', { continued: true }).fontSize(10).text(`  ${order.user.username}`);
      doc.moveDown();
      doc.text(`Email: ${order.user.email}`);
      doc.moveDown();
      doc.moveDown();
      
      // Delivery Address
      doc.fontSize(12).text('Ship To:');
      doc.fontSize(10).text(`${order.deliveryAddress.addressLine1}`);
      if (order.deliveryAddress.addressLine2) {
        doc.text(`${order.deliveryAddress.addressLine2}`);
      }
      doc.text(`${order.deliveryAddress.city}, ${order.deliveryAddress.state} ${order.deliveryAddress.postalCode}`);
      doc.text(`${order.deliveryAddress.country}`);
      doc.text(`Phone: ${order.deliveryAddress.phoneNumber}`);
      
      drawLine(doc.y + 10);
      doc.moveDown();
      doc.moveDown();
  
      // Table header
      const tableTop = doc.y;
      doc.font('Helvetica-Bold');
      doc.text('Product', 50, tableTop, { width: 200 });
      doc.text('Quantity', 250, tableTop, { width: 100, align: 'center' });
      doc.text('Price', 350, tableTop, { width: 100, align: 'right' });
      doc.text('Total', 450, tableTop, { width: 100, align: 'right' });
      
      drawLine(doc.y + 5);
      doc.font('Helvetica');
  
      // Product details
      let y = doc.y + 10;
      order.products.forEach(item => {
        doc.text(item.product.name, 50, y, { width: 200 });
        doc.text(item.quantity.toString(), 250, y, { width: 100, align: 'center' });
        doc.text(`₹${item.price.toFixed(2)}`, 350, y, { width: 100, align: 'right' });
        doc.text(`₹${item.totalPrice.toFixed(2)}`, 450, y, { width: 100, align: 'right' });
        y += 20;
      });
  
      drawLine(y + 7);
      y += 15;
  
      // Total
      doc.font('Helvetica-Bold');
      doc.text(`Total Amount:`, 350, y, { width: 100, align: 'right' });
      doc.text(`Rs${order.totalAmount.toFixed(2)}`, 450, y, { width: 100, align: 'right' });
  
      // Footer
      doc.fontSize(10).text(
        'Thank you for your business!',
        50,
        doc.page.height - 50,
        { align: 'center', width: doc.page.width - 100 }
      );
  
      // Finalize the PDF and end the stream
      doc.end();
    } catch (error) {
      console.error('Error generating invoice:', error);
      res.status(500).json({ error: error.message });
    }
  };