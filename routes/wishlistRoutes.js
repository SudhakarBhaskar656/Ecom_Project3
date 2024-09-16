const express = require("express");
const { UserIsLoggedIn } = require("../middlewares/auth.middleware");
const { addToWishList, removeFromWishlist, userWishlist } = require("../controllers/wishlist.controllers");
const router = express.Router();

// /add
 router.put("/add", UserIsLoggedIn, addToWishList)

// /remove
router.put("/remove", UserIsLoggedIn, removeFromWishlist)

// /view
router.get("/view", UserIsLoggedIn,  userWishlist)


module.exports = router;







