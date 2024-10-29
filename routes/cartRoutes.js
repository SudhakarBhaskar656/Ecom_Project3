const express = require('express');
const { UserIsLoggedIn } = require('../middlewares/auth.middleware');
const { addToCart, removeFromCart, viewCart} = require('../controllers/cart.controllers');
const router = express.Router();

// /add
// tested
router.post("/add", UserIsLoggedIn, addToCart);

// /remove
// tested
router.put("/remove", UserIsLoggedIn, removeFromCart);

// /mycart
// tested
router.get("/mycart", UserIsLoggedIn, viewCart )





module.exports = router