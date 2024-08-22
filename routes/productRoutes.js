const express = require('express');
const router = express.Router();
const { addProduct, totalproducts, singleproduct, updateproduct, deleteproduct, productByCategory, updateProduct, searchProducts } = require('../controllers/product.controllers');
const { AdminIsLoggedIn } = require('../middlewares/auth.middleware');

// /add
router.post("/add", AdminIsLoggedIn, addProduct);

// /all
router.get("/all", totalproducts);

// /product/:id
router.get("/product/:id", singleproduct);

// /product/update/:id
router.put("/product/update/:productId", AdminIsLoggedIn, updateProduct);

// /product/delete/:id
router.delete("/product/delete/:id",AdminIsLoggedIn, deleteproduct);

///category
router.get("/category",  productByCategory);


// /searchproducts
router.get("/searchproducts", searchProducts);


module.exports = router