const express = require('express');
const router = express.Router();
const  {AdminIsLoggedIn} = require("../middlewares/auth.middleware");
const { TotalOrders, getReports, getOrderStatus } = require('../controllers/dashboard.controller');

// total/orders
// tested
router.get("/total/orders",  AdminIsLoggedIn,  TotalOrders)

//  /generate/reports
// tested
router.get("/generate/reports", AdminIsLoggedIn, getReports)


// /orders/status
// tested
router.get("/orders/status", AdminIsLoggedIn, getOrderStatus )


module.exports = router;