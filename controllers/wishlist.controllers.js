const userModel = require("../models/user.model")

exports.addToWishList = async (req, res) => {
    try {
        const loginuser =  await userModel.findOne({email :   req.user.email})
        const { productId } = req.body;

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


exports.removeFromWishlist = async (req, res) => {
    try {
        const loginuser = await userModel.findOne({ email: req.user.email });
        const { productId } = req.body;

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



exports.userWishlist = async (req, res) => {
    try {
        const loginuser =  await userModel.findOne({email : req.user.email});
        const user = await userModel.findById(loginuser._id).populate('wishlist');
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({ wishlist: user.wishlist });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
}


