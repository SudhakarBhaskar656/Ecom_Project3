const express = require('express');
const {UserIsLoggedIn,AdminIsLoggedIn} = require("../middlewares/auth.middleware");
const { createOrder, getUserOrders, getOrderById, updateOrderStatus, cancelOrder, generateInvoice } = require('../controllers/order.controllers');
const router = express.Router();

// Create a new order (for Users)
// /create
// tested
router.post('/create',UserIsLoggedIn, createOrder);

// Get all orders for the logged-in user
// /user/orders
// tested
router.get('/user/orders',UserIsLoggedIn , getUserOrders);

// Get a single order by order ID (for Users/Admins)
// /:orderId
// tested
router.get('/:orderId', UserIsLoggedIn, getOrderById);

// Update order status (for Admin)
// /update/:orderId/status
router.put('/update/:orderId/status', AdminIsLoggedIn, updateOrderStatus);


// Cancel an order (for Admins)
// /cancel/orderId
router.put('/cancel/:orderId',AdminIsLoggedIn, cancelOrder);


// Cancel an order (for Users)
// /cancel/orderId
router.put('/cancel/:orderId',UserIsLoggedIn, cancelOrder);

// /generate/:orderId
router.get('/generate/:orderId', UserIsLoggedIn, generateInvoice);

module.exports = router;
