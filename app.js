
require("dotenv").config({ path: "./.env" });
const express = require('express');
const app = express();
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const usersRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const productRoutes = require("./routes/productRoutes");
const cartRoutes = require("./routes/cartRoutes");
const cors = require("cors");

// Set up a database connection
require("./config/db.config").DbConnection();

// CORS middleware
app.use(cors()); // Adjust CORS options if needed

// Logger middleware
app.use(logger('tiny'));

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

// Catch-all route for unknown paths
app.all('*', (req, res) => {
    res.status(404).json({ success: false, message: `${req.url} not found` });
});

// Start server
const PORT = process.env.PORT || 8080; // Default to 8080 if PORT is not defined
app.listen(PORT, () => {
    console.log(`Server started running on port ${PORT}`);
});
