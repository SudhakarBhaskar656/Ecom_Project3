
require("dotenv").config({ path: "./.env" });
const express = require('express');
const app = express();
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const usersRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const productRoutes = require("./routes/productRoutes");
const cartRoutes = require("./routes/cartRoutes");
const wishlistRoutes =  require("./routes/wishlistRoutes");
const orderRoutes = require("./routes/orderRoutes")
const dashboardRoutes = require("./routes/dashboardRoutes")
const cors = require("cors");
const helmet = require("helmet")


// Set up a database connection
require("./config/db.config").DbConnection();

// CORS middleware for apis access.
app.use(cors()); 

// Logger middleware
app.use(logger('tiny'));

//secure http headers
app.use(helmet());

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser
app.use(cookieParser());

// Base URI for user routes
app.use(`/Ecommerce/users/user`, usersRoutes);

// Base URI for admin routes
app.use("/Ecommerce/admins/admin", adminRoutes);

// Base URI for product routes
app.use('/Ecommerce/products', productRoutes);

// Base URI for cart routes
app.use('/Ecommerce/users/user/cart', cartRoutes);

// Base URI for wishlist routes
app.use("/Ecommerce/user/wishlist", wishlistRoutes)

// Base URI for order routes
app.use("/Ecommerce/order", orderRoutes)

// Base URI for dashboard routes
app.use("/Ecommerce/dashboard", dashboardRoutes)

// Catch-all route for unknown paths
app.all('*', (req, res) => {
    res.status(404).json({ success: false, message: `${req.url} not found` });
});

// Start server
const PORT = process.env.PORT || 8080; 
app.listen(PORT, () => {
    console.log(`Server started running on port ${PORT}`);
});
