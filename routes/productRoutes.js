const express = require('express');
const router = express.Router();
const { addProduct, totalProducts, singleProduct, updateProduct, deleteProduct, productByCategory, searchProducts, sortProducts, uploadImages, addReview, getProductReviews } = require('../controllers/product.controllers');
const { AdminIsLoggedIn, UserIsLoggedIn } = require('../middlewares/auth.middleware');
const upload = require("../utils/multer");

// /add
// router.post("/add", [AdminIsLoggedIn, uploadImages], addProduct);
router.post('/add', [AdminIsLoggedIn, upload.array('images', 5)], addProduct);

// /all
router.get("/all", totalProducts);

// /product/:id
router.get("/product/:id", singleProduct);

// /product/update/:id
router.put("/product/update/:productId", AdminIsLoggedIn, updateProduct);

// /product/delete/:id
router.delete("/product/delete/:id",AdminIsLoggedIn, deleteProduct);

///category
router.get("/category",  productByCategory);

// /searchproducts
router.get("/searchproducts", searchProducts);

//filter products
router.get("/filterproducts",  sortProducts);

// /add/review
router.post("/add/review", UserIsLoggedIn, addReview);

// /product/:productId/reviews
router.get('/product/:productId/reviews', UserIsLoggedIn, getProductReviews);

module.exports = router;