require("dotenv").config();
const productModel = require("../models/product.model");



const numberWithCommas = (number) => {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

exports.addProduct = async (req, res, next) => {
    try {
        const { name, description, price, category, stock, images, discount } = req.body;

        // Check if all required fields are present
        if (!name || !description || !price || !category || !stock || !images || !discount) {
            return res.status(400).json({ success: false, message: "Please fill in all product details" });
        }

        // Sanitize and validate price
        let sanitizedPrice = parseFloat(price.replace(/,/g, '')); // Remove commas and convert to number
        if (isNaN(sanitizedPrice) || sanitizedPrice < 0) {
            return res.status(400).json({ success: false, message: "Price must be a valid number greater than or equal to 0" });
        }

        // Sanitize and validate discount
        let numericDiscount = parseFloat(discount);
        if (isNaN(numericDiscount) || numericDiscount < 0 || numericDiscount > 100) {
            return res.status(400).json({ success: false, message: "Discount must be a number between 0 and 100" });
        }

        // Calculate the final price after discount
        let finalPrice = sanitizedPrice;
        if (numericDiscount > 0) {
            finalPrice = sanitizedPrice - (sanitizedPrice * (numericDiscount / 100));
        }

        // Create a new product
        const newProduct = await productModel.create({
            name,
            description,
            price: sanitizedPrice,
            priceAfterDiscount: finalPrice,
            category,
            stock,
            images,
            discount: numericDiscount
        });

        // Format numbers with commas
        const formattedPrice = numberWithCommas(newProduct.price);
        const formattedPriceAfterDiscount = numberWithCommas(newProduct.priceAfterDiscount);

        // Return the response with formatted prices
        res.status(200).json({
            success: true,
            newProduct: {
                ...newProduct.toObject(),
                price: formattedPrice,
                priceAfterDiscount: formattedPriceAfterDiscount
            }
        });

    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};



exports.totalproducts = async (req, res, next) => {
    // Function to format numbers with commas
    const numberWithCommas = (number) => {
        return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };

    try {
        // Fetch all products from the database
        const products = await productModel.find().exec();

        // Check if products were found
        if (!products || products.length === 0) {
            return res.status(404).json({ success: false, message: "No products found" });
        }

        // Format prices with commas
        const formattedProducts = products.map(product => ({
            ...product.toObject(),
            price: numberWithCommas(product.price),
            priceAfterDiscount: product.priceAfterDiscount ? numberWithCommas(product.priceAfterDiscount) : undefined
        }));

        // Send the response
        res.status(200).json({
            success: true,
            products: formattedProducts
        });

    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};


exports.singleproduct = async (req, res, next) => {
    // Function to format numbers with commas
    const numberWithCommas = (number) => {
        return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };
   
    try {
        // Extract product ID from request parameters
        const productId = req.params.id;

        // Fetch the product by ID
        const product = await productModel.findById(productId).exec();

        // Check if product was found
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        // Format prices with commas
        const formattedProduct = {
            ...product.toObject(),
            price: numberWithCommas(product.price),
            priceAfterDiscount: product.priceAfterDiscount ? numberWithCommas(product.priceAfterDiscount) : undefined
        };

        // Send the response
        res.status(200).json({
            success: true,
            product: formattedProduct
        });

    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};


exports.updateproduct = async (req, res, next) => {
    // Function to format numbers with commas
    const numberWithCommas = (number) => {
        return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };

    try {
        // Extract product ID from request parameters
        const productId = req.params.id;
        const updates = req.body;

        // Check if the product ID is valid and provided
        if (!productId) {
            return res.status(400).json({ success: false, message: "Product ID is required" });
        }

        // Validate and sanitize fields if provided
        if (updates.price) {
            updates.price = parseFloat(updates.price.replace(/,/g, ''));
            if (isNaN(updates.price) || updates.price < 0) {
                return res.status(400).json({ success: false, message: "Invalid price value" });
            }
        }

        if (updates.discount) {
            updates.discount = parseFloat(updates.discount);
            if (isNaN(updates.discount) || updates.discount < 0 || updates.discount > 100) {
                return res.status(400).json({ success: false, message: "Discount must be between 0 and 100" });
            }
        }

        // Update the product
        const updatedProduct = await productModel.findByIdAndUpdate(productId, updates, {
            new: true,
            runValidators: true
        }).exec();

        // Check if the product was found and updated
        if (!updatedProduct) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        // Format prices with commas if they were updated
        const formattedProduct = {
            ...updatedProduct.toObject(),
            price: numberWithCommas(updatedProduct.price),
            priceAfterDiscount: updatedProduct.priceAfterDiscount ? numberWithCommas(updatedProduct.priceAfterDiscount) : undefined
        };

        // Send the response
        res.status(200).json({
            success: true,
            product: formattedProduct
        });

    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};


exports.deleteproduct = async (req, res, next) => {
    try {
        // Extract product ID from request parameters
        const productId = req.params.id;
        
        // Check if the product was found or not
        if (! productId) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        // Delete the product by ID
        const deletedProduct = await productModel.findByIdAndDelete(productId).exec();


        // Send success response
        res.status(200).json({
            success: true,
            message: "Product deleted successfully"
        });

    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};