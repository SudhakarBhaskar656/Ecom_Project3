const userModel = require("../models/user.model")
const NodeCache = require("node-cache");
const myCache = new NodeCache({ stdTTL: 100, checkperiod: 120 });


// add a product in  user wishlist through Id
exports.addToWishList = async (req, res) => {
    try {
        const loginuser =  await userModel.findOne({email :   req.user.email})
        const { productId } = req.body || req.query;

        if(! productId){
            return res.status(403).json({success : false, message : "Product Id not Found "})
        }
        const user = await userModel.findById(loginuser._id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (!user.wishlist.includes(productId)) {
            user.wishlist.push(productId);
            await user.save();
            res.status(200).json({ message: "Product added to wishlist", wishlist: user.wishlist });
        } else {
            res.status(400).json({ message: "Product already in wishlist" });
        }
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
}

// remove particular product from wishlist using productId
exports.removeFromWishlist = async (req, res) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email });
        const { productId } = req.body || req.query;

        if (!productId) {
            return res.status(403).json({ success: false, message: "Product ID not found" });
        }

        const user = await userModel.findById(loginuser._id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const productIndex = user.wishlist.indexOf(productId);

        if (productIndex === -1) {
            return res.status(404).json({ message: "Product not found in wishlist" });
        }

        user.wishlist.splice(productIndex, 1);  // Remove the product using splice
        await user.save();

        res.status(200).json({ message: "Product removed from wishlist", wishlist: user.wishlist });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};


// get user wishlist of the products
exports.userWishlist = async (req, res) => {
    try {
        const userEmail = req.user.email;

        // Create a cache key based on the user's email
        const cacheKey = `wishlist_${userEmail}`;

        // Check if wishlist data exists in the cache
        const cachedWishlist = myCache.get(cacheKey);
        if (cachedWishlist) {
            return res.status(200).json(cachedWishlist); // Return cached response
        }

        // Find the user by email
        const loginuser = await userModel.findOne({ email: userEmail });
        if (!loginuser) {
            return res.status(404).json({ message: "User not found" });
        }

        // Find the user's wishlist and populate it
        const user = await userModel.findById(loginuser._id).populate('wishlist');
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Prepare the response object
        const response = { wishlist: user.wishlist };

        // Store the response in the cache
        myCache.set(cacheKey, response);

        // Send the response with the user's wishlist
        res.status(200).json(response);
    } catch (error) {
        console.error('Error in userWishlist:', error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};


