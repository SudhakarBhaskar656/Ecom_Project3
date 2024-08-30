const express = require('express');
const { UserIsLoggedIn } = require('../middlewares/auth.middleware');
const { addToCart, removeFromCart, viewCart} = require('../controllers/cart.controllers');
const router = express.Router();

// /add
router.post("/add", UserIsLoggedIn, addToCart);

// /remove
router.put("/remove", UserIsLoggedIn, removeFromCart);


// /cart/view
router.get("/view", UserIsLoggedIn, viewCart )





module.exports = router