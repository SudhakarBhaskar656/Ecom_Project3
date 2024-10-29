const express = require("express");
const { UserIsLoggedIn } = require("../middlewares/auth.middleware");
const { addToWishList, removeFromWishlist, userWishlist } = require("../controllers/wishlist.controllers");
const router = express.Router();

// /add
// tested
 router.put("/add", UserIsLoggedIn, addToWishList)

// /remove
// tested
router.put("/remove", UserIsLoggedIn, removeFromWishlist)

// /mywishlist
// tested
router.get("/mywishlist", UserIsLoggedIn,  userWishlist)


module.exports = router;







