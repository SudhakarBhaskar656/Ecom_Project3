const express = require('express');
const {UserIsLoggedIn,AdminIsLoggedIn} = require("../middlewares/auth.middleware");
const { createOrder, getUserOrders, getOrderById, updateOrderStatus, cancelOrder } = require('../controllers/order.controllers');
const router = express.Router();

// Create a new order (for Users)
// /create
router.post('/create',UserIsLoggedIn, createOrder);

// Get all orders for the logged-in user
// /user/orders
router.get('/user/orders',UserIsLoggedIn , getUserOrders);

// Get a single order by order ID (for Users/Admins)
// /:orderId
router.get('/:orderId', UserIsLoggedIn, getOrderById);

// Update order status (for Admin)
// /update/:orderId/status
router.put('/update/:orderId/status', AdminIsLoggedIn, updateOrderStatus);

// Cancel an order (for Users)
// /cancel/orderId
router.put('/cancel/:orderId',UserIsLoggedIn, cancelOrder);



module.exports = router;
