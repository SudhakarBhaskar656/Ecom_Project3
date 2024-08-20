const express = require('express');
const { UserIsLoggedIn } = require('../middlewares/auth.middleware');
const { addToCart, removeFromCart, viewCart} = require('../controllers/cart.controllers');
const router = express.Router();


// /add
router.post("/add", addToCart);

// /remove
router.put("/remove", removeFromCart);

// /cart/view
router.get("/view", viewCart )


module.exports = router