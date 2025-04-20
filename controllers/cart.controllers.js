const CartModel = require('../models/cart.model');
const productModel = require('../models/product.model');
const userModel = require('../models/user.model');
const NodeCache = require("node-cache");
const myCache = new NodeCache({ stdTTL: 100, checkperiod: 120 });


// add product in loginuser cart reference product Id to cart 
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
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
};


exports.removeFromCart = async (req, res, next) => {
  try {
    const userId = req.user.userid;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required." });
    }

    const cart = await CartModel.findOne({ user: userId });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found." });
    }

    const initialItemsLength = cart.items.length;

    // Filter out the product from cart items
    cart.items = cart.items.filter(item => item.product.toString() !== productId);

    if (cart.items.length === initialItemsLength) {
      return res.status(404).json({ message: "Product not found in cart." });
    }

    await cart.save();

    return res.status(200).json({
      message: "Product removed from cart successfully.",
      cart: cart
    });

  } catch (error) {
    console.error("Error removing product from cart:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};


// viewCart
exports.viewCart = async (req, res, next) => {
    try {
      const userEmail = req.user.email;
  
      // Create a cache key based on the user email
      const cacheKey = `cart_${userEmail}`;
  
      // Check if cart data exists in the cache
      const cachedCart = myCache.get(cacheKey);
      if (cachedCart) {
        return res.status(200).json(cachedCart); // Return cached response
      }
  
      // Find the user and populate the mycart field
      const loginuser = await userModel.findOne({ email: userEmail }).populate("mycart");
  
      // Check if user was found
      if (!loginuser) {
        return res.status(401).json({ success: false, message: "Login user not found" });
      }
  
      // Get the cart items
      const cartItems = loginuser.mycart;
  
      // Function to get random items from the product model
      const getRandomProducts = async (count) => {
        const allProducts = await productModel.find(); // Fetch all products
        const shuffled = allProducts.sort(() => 0.5 - Math.random()); // Shuffle the products
  
        return shuffled.slice(0, count); // Get the first count products
      };
  
      // Get up to 20 random products
      const randomProducts = await getRandomProducts(20);
  
      // Prepare the response object
      const response = {
        success: true,
        carts: cartItems,
        user: loginuser,
        randomProducts: randomProducts
      };
  
      // Store the response in the cache
      myCache.set(cacheKey, response);
       
      // Respond with user data and random products
      res.status(200).json(response);
  
    } catch (error) {
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  };
  








