require("dotenv").config();
const productModel = require("../models/product.model");
const userModel = require("../models/user.model")
const reviewModel = require("../models/review.model")
const multer = require('multer');
const path = require('path');
const cloudinary = require('../config/cloudinary');
const upload = require('../utils/multer');


const numberWithCommas = (number) => {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}


exports.totalProducts = async (req, res, next) => {
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


exports.singleProduct = async (req, res, next) => {
    // Function to format numbers with commas
    const numberWithCommas = (number) => {
        return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };

    try {
        // Extract product ID from request parameters or query
        const productId = req.params.id || req.query.id;

        // Fetch the product by ID
        const product = await productModel.findById(productId).exec();

        // Check if product was found
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        // Find similar products in the same category
        let similarProducts = await productModel.find({
            category: product.category,
            _id: { $ne: productId } // Exclude the current product
        }).limit(10).lean(); // Using .lean() to return plain JavaScript objects

        let responseProducts = [];

        // If similar products are found, set them as similarProducts
        if (similarProducts.length > 0) {
            responseProducts = similarProducts.map(item => ({
                ...item,
                price: numberWithCommas(item.price),
                priceAfterDiscount: item.priceAfterDiscount ? numberWithCommas(item.priceAfterDiscount) : undefined
            }));
        } else {
            // If no similar products are found, fetch random products
            const moreProducts = await productModel.aggregate([
                { $match: { _id: { $ne: productId } } }, // Exclude the current product
                { $sample: { size: 20 } } // Get up to 20 random products
            ]);

            responseProducts = moreProducts.map(item => ({
                ...item,
                price: numberWithCommas(item.price),
                priceAfterDiscount: item.priceAfterDiscount ? numberWithCommas(item.priceAfterDiscount) : undefined
            }));
        }

        // Format the single product
        const formattedProduct = {
            ...product.toObject(),
            price: numberWithCommas(product.price),
            priceAfterDiscount: product.priceAfterDiscount ? numberWithCommas(product.priceAfterDiscount) : undefined
        };

        // Prepare the response JSON structure
        const response = {
            success: true,
            product: formattedProduct,
            similarProducts: similarProducts.length > 0 ? responseProducts : undefined,
            moreProducts: similarProducts.length === 0 ? responseProducts : undefined
        };

        // Send the response
        res.status(200).json(response);

    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};


exports.deleteProduct = async (req, res, next) => {
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


exports.updateProduct = async (req, res, next) => {
    try {

        const numberWithCommas = (number) => {
            return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        };

        const { name, description, price, category, stock, images, discount } = req.body;
        const productId = req.params.productId || req.query.productId;

        if (!productId) {
            return res.status(400).json({ success: false, message: "Product ID is required" });
        }

        // Check if all required fields are present
        if (!name || !description || !price || !category || !stock || !images || !discount) {
            return res.status(400).json({ success: false, message: "Please provide all product details" });
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

        // Update the product
        const updatedProduct = await productModel.findByIdAndUpdate(productId, {
            name,
            description,
            price: sanitizedPrice,
            priceAfterDiscount: finalPrice,
            category,
            stock,
            images,
            discount: numericDiscount
        }, { new: true, runValidators: true });

        if (!updatedProduct) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        // Format numbers with commas for the response
        const formattedProduct = {
            ...updatedProduct.toObject(),
            price: numberWithCommas(updatedProduct.price),
            priceAfterDiscount: numberWithCommas(updatedProduct.priceAfterDiscount)
        };

        // Return the response with formatted prices
        res.status(200).json({
            success: true,
            product: formattedProduct
        });

    } catch (error) {
        console.error('Error updating product:', error);

        if (error.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: error.message });
        }

        if (error.kind === 'ObjectId') {
            return res.status(400).json({ success: false, message: "Invalid product ID format" });
        }

        res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};


exports.productByCategory = async (req, res, next) => {
    try {

        let category = req.query.category || req.params.category;
        category = category.toLowerCase();
        
        if (!category) {
            return res.status(400).json({ success: false, message: 'Category is required' });
        }
        
        // Find products by category, ensuring that category matches exactly
        const products = await productModel.find({ category: category });


        if (products.length === 0) {
            console.log('Category:', category); // Debugging
            return res.status(404).json({ success: false, message: 'No products found for this category' });
        }
        res.status(200).json({ success: true, products });
    } catch (error) {
        console.error('No Products Found For this Category', error); // Debugging
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
};


exports.searchProducts = async (req, res, next) => {
    try {
        const { query } = req.query; // Retrieve the search query from the request

        // Check if the query parameter is provided
        if (!query) {
            return res.status(400).json({ success: false, message: 'Query is required' });
        }

        // Create a case-insensitive regex pattern for matching the query
        const regexPattern = new RegExp(query, 'i');

        // Find products that match the query in title, category, or any other fields
        const products = await productModel.find({
            $or: [
                { name: { $regex: regexPattern } },
                { category: { $regex: regexPattern } },
                { description: { $regex: regexPattern } },
                // Add other fields you want to search here
            ]
        }).lean(); // Use .lean() to return plain JavaScript objects for better performance

        // Check if no products were found
        if (products.length === 0) {
            return res.status(404).json({ success: false, message: 'No products found' });
        }

        // Send the response with found products
        res.status(200).json({ success: true, products });
    } catch (error) {
        console.error('Error in searchProducts:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }




};


exports.addProduct = async (req, res) => {
    try {
      const { name, description, price, category, stock, discount } = req.body;
  
      // Validate product details
      if (!name || !description || !price || !category || !stock || !discount) {
        return res.status(400).json({ success: false, message: "Please fill in all product details" });
      }
  
      // Sanitize and validate price
      let sanitizedPrice = parseFloat(price.replace(/,/g, ''));
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
  
      // Get Cloudinary image URLs
      const images = req.files.map(file => file.path); // Cloudinary stores the URL in `file.path`
  
      // Create a new product in the database
      const newProduct = await productModel.create({
        name,
        description,
        price: sanitizedPrice,
        priceAfterDiscount: finalPrice,
        category,
        stock,
        images,
        discount: numericDiscount,
      });
  
      // Respond with the created product
      res.status(201).json({
        success: true,
        newProduct,
      });
  
    } catch (error) {
      console.error('Error creating product:', error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  };


  exports.sortProducts = async (req, res, next) => {
    try {
      // Get price range from query parameters
      const { minPrice, maxPrice } = req.query;
  
      // Validate minPrice and maxPrice
      if (!minPrice || !maxPrice) {
        return res.status(400).json({ message: 'minPrice and maxPrice are required.' });
      }
  
      const min = Number(minPrice);
      const max = Number(maxPrice);
  
      // Validate that min and max are numbers and min <= max
      if (isNaN(min) || isNaN(max) || min > max) {
        return res.status(400).json({ message: 'Invalid price range provided.' });
      }
  
      // Create filter object for price range
      const filter = {
        price: { $gte: min, $lte: max }
      };
  
      // Fetch and sort products by price within the specified range
      const products = await productModel.find(filter)
        .sort({ price: 1 })
        .select('name price images category discount priceAfterDiscount'); // Project only necessary fields
  
      // Respond with sorted and filtered products
      res.status(200).json({success : true, products});
    } catch (error) {
      console.error('Error fetching products:', error); // Log the error for debugging
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  };



  exports.addReview = async (req, res) => {
    try {
      const { productId, rating, comment } = req.body;
      const loginuser = await  userModel.findOne({email : req.user.email})
        // Assuming you're using authentication
       if(! loginuser){
         return res.status(403).json({success : false, message : "Login user not found!"})
       }
      // Validate input fields
      if (!productId || !rating || !comment) {
        return res.status(400).json({ success: false, message: "All fields are required" });
      }
  
      // Check if the product exists
      const product = await productModel.findById(productId);
      if (!product) {
        return res.status(404).json({ success: false, message: "Product not found" });
      }
  
      // Check if user already reviewed this product
      const existingReview = await reviewModel.findOne({ user: loginuser._id, product: productId });
      if (existingReview) {
        return res.status(400).json({ success: false, message: "You have already reviewed this product" });
      }
  
      // Create the new review
      const review = await reviewModel.create({
        user: loginuser._id,
        product: productId,
        rating,
        comment
      });
  
      // Update product's review stats (optional)
      product.reviews.push(review._id);
      await product.save();
      await loginuser.save();
  
      // Send response
      res.status(201).json({
        success: true,
        message: 'Review added successfully',
        review
      });
    } catch (error) {
      console.error('Error adding review:', error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  };


  exports.getProductReviews = async (req, res) => {
    try {
      const { productId } = req.params || req.query;
      // Check if the product exists
      const product = await productModel.findById(productId);
      if (!product) {
        return res.status(404).json({ success: false, message: "Product not found" });
      }
  
      // Find all reviews related to this product
      const reviews = await reviewModel.find({ product: productId })
        .populate('user', 'username profile') // Populating the user details (optional)
        .sort({ createdAt: -1 }); // Sort by newest first (optional)
      if (reviews.length === 0) {
        return res.status(404).json({ success: false, message: "No reviews found for this product" });
      }
  
      // Return the reviews
      res.status(200).json({
        success: true,
        reviews,
      });
  
    } catch (error) {
      console.error('Error fetching product reviews:', error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  };
  
