const cartModel = require('../models/cart.model');
const productModel = require('../models/product.model');
const userModel = require('../models/user.model');




exports.addToCart = async (req, res, next) => {
    try {
        const userId = req.user.userid; // Assuming user is authenticated and req.user.userid is available
        const { productId } = req.body || req.query.id;

        // Check if the product ID is provided
        if (!productId) {
            return res.status(400).json({ success: false, message: 'Product ID is required' });
        }

        // Check if the product exists
        const product = await productModel.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Find the user's cart or create a new one if it doesn't exist
        let cart = await cartModel.findOne({ user: userId });
        if (!cart) {
            cart = new cartModel({ user: userId, items: [] });
        }

        // Check if the product is already in the cart
        const cartItemIndex = cart.items.findIndex(item => item.product.toString() === productId);

        if (cartItemIndex > -1) {
            // If the product is already in the cart, increment the quantity
            cart.items[cartItemIndex].quantity += 1;
        } else {
            // If the product is not in the cart, add it as a new item with quantity 1
            cart.items.push({ product: productId, quantity: 1 });
        }

        // Save the cart
        await cart.save();

        // Update the user's document to include the product ID in their mycart array
        await userModel.findByIdAndUpdate(userId, { $addToSet: { mycart: productId } });

        res.status(200).json({ success: true, message: 'Product added to cart', cart });
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
};



exports.removeFromCart = async (req, res, next) => {

    try {
        console.log(req.user.userid)
        const userId = req.user.userid; // Assuming user is authenticated and req.user.userid is available
        const productId = req.query.productId || req.body.productId; // Extract productId from query string
         
        if (!productId) {
            return res.status(400).json({ success: false, message: 'Product ID is required' });
        }

        // Validate the existence of the product
        const product = await productModel.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Remove the product from the user's mycart array
        await userModel.findByIdAndUpdate(userId, { $pull: { mycart: productId } });

        // Find the user's cart and remove the product from the cart items
        const cart = await cartModel.findOne({ user: userId });
        if (cart) {
            // Filter out the item with the specified productId
            cart.items = cart.items.filter(item => item.product.toString() !== productId);

            // Save the updated cart or remove it if empty
            if (cart.items.length === 0) {
                await cart.remove(); // Remove cart if empty
            } else {
                await cart.save(); // Save updated cart
            }
        }

        res.status(200).json({ success: true, message: 'Product removed from cart' });
    } catch (error) {
        console.error('Error removing from cart:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};



exports.viewCart = async (req, res, next) => {
    try {
        // Find the user and populate the mycart field
        const loginuser = await userModel.findOne({ email: req.user.email }).populate("mycart");

        // Check if user was found
        if (!loginuser) {
            return res.status(401).json({ success: false, message: "Login user not found" });
        }

        // Get the cart items (optional, if you need to include cart items in the response)
        const cartItems = loginuser.mycart;

        // Function to get random items from the product model
        const getRandomProducts = async (count) => {
            const allProducts = await productModel.find(); // Fetch all products
            const shuffled = allProducts.sort(() => 0.5 - Math.random()); // Shuffle the products

            return shuffled.slice(0, count); // Get the first count products
        };

        // Get up to 20 random products
        const randomProducts = await getRandomProducts(20);

        // Respond with user data and random products
        res.status(200).json({
            success: true,
            carts: loginuser.mycart,
            user: loginuser,
            randomProducts: randomProducts
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};






