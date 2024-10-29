const productModel = require("../models/product.model")
const userModel = require("../models/user.model")
const orderModel = require("../models/order.model")
const NodeCache = require("node-cache");
const myCache = new NodeCache({ stdTTL: 100, checkperiod: 120 });


// total orders cutomer list controller

exports.TotalOrders = async (req, res, next) => {
    try {
        // Define a cache key for total orders
        const cacheKey = 'totalOrders';

        // Check if total orders data exists in the cache
        const cachedOrders = myCache.get(cacheKey);
        if (cachedOrders) {
            return res.status(200).json({ success: true, data: cachedOrders }); // Return cached response
        }

        // Find all orders from all users and populate user details
        const orders = await orderModel.find().populate('user', 'username email createdAt'); // Populate user details including createdAt
        
        // Check if there are no orders
        if (orders.length === 0) {
            return res.status(404).json({ success: false, message: "No orders found" });
        }

        // Create a map to track users and their order details
        const userMap = {};

        orders.forEach(order => {
            const user = order.user; // Get the user from the order
            
            // Check if the user is present
            if (user) {
                const userId = user._id.toString(); // Ensure userId is a string
                if (!userMap[userId]) {
                    const createdAt = new Date(user.createdAt);
                    const formattedJoinDate = `${createdAt.getFullYear()} ${createdAt.toLocaleString('default', { month: 'long' })} ${createdAt.getDate()}`; // Format joinDate

                    userMap[userId] = {
                        customerId: userId,
                        name: user.username,
                        email: user.email,
                        totalOrders: 0,
                        totalSpent: 0,
                        joinDate: formattedJoinDate, // Using formatted joinDate
                        paymentStatus: order.paymentStatus // Show payment status directly from order.paymentStatus
                    };
                }
                userMap[userId].totalOrders += 1;
                userMap[userId].totalSpent += order.totalAmount;
            } else {

                res.json({ warning: 'Order ${order._id} has no associated user'})
            }
        });

        // Convert userMap to an array
        const customers = Object.values(userMap);

        // Prepare response data
        const responseData = {
            customers: customers // Include the array of customers
        };

        // Store the response in the cache
        myCache.set(cacheKey, responseData);

        // Send response
        res.status(200).json({ success: true, data: responseData });
    } catch (error) {

        res.status(error.status || 500).json({ success: false, message: error.message });
    }
};



// get reports from insights
exports.getReports = async (req, res, next) => {
    try {
        // Fetch total sales, total orders, total customers, and total products dynamically from the database
        const [totalSales, totalOrders, totalCustomers, totalProducts] = await Promise.all([
            orderModel.aggregate([{ $group: { _id: null, total: { $sum: "$totalAmount" } } }]).then(result => result[0]?.total || 0),
            orderModel.countDocuments(),
            userModel.countDocuments({ _id: { $in: await orderModel.distinct("user") } }),
            productModel.countDocuments()
        ]);

        // Fetch detailed reports dynamically
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        const [monthlySales, monthlyOrders, newCustomers] = await Promise.all([
            orderModel.aggregate([
                { $match: { orderDate: { $gte: lastMonth } } },
                { $group: { _id: null, total: { $sum: "$totalAmount" } } }
            ]).then(result => result[0]?.total || 0),
            orderModel.countDocuments({ orderDate: { $gte: lastMonth } }),
            userModel.countDocuments({
                _id: { $in: await orderModel.distinct("user", { orderDate: { $gte: lastMonth } }) },
                createdAt: { $gte: lastMonth }
            })
        ]);

        // Calculate repeat customers percentage dynamically
        const repeatCustomersCount = await orderModel.aggregate([
            { $group: { _id: "$user", count: { $sum: 1 } } },
            { $match: { count: { $gt: 1 } } }
        ]).then(result => result.length);

        const repeatCustomersPercentage = totalCustomers > 0 ? 
            ((repeatCustomersCount / totalCustomers) * 100).toFixed(2) + "%" : "0%";

        // Calculate growth dynamically for total orders, sales, and customers
        const previousTotalOrders = await orderModel.countDocuments({ orderDate: { $lt: lastMonth } });
        const previousTotalSales = await orderModel.aggregate([
            { $match: { orderDate: { $lt: lastMonth } } },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]).then(result => result[0]?.total || 0);
        const previousTotalCustomers = await userModel.countDocuments({
            _id: { $in: await orderModel.distinct("user", { orderDate: { $lt: lastMonth } }) }
        });

        const ordersGrowth = previousTotalOrders > 0 ? 
            (((totalOrders - previousTotalOrders) / previousTotalOrders) * 100).toFixed(2) + "%" : "0%";
        const salesGrowth = previousTotalSales > 0 ? 
            (((totalSales - previousTotalSales) / previousTotalSales) * 100).toFixed(2) + "%" : "0%";
        const customersGrowth = previousTotalCustomers > 0 ? 
            (((totalCustomers - previousTotalCustomers) / previousTotalCustomers) * 100).toFixed(2) + "%" : "0%";

        // Prepare response data
        const responseData = {
            reports: {
                totalSales: {
                    value: totalSales,
                    growth: salesGrowth // Dynamic growth calculation
                },
                totalOrders: {
                    value: totalOrders,
                    growth: ordersGrowth // Dynamic growth calculation
                },
                totalCustomers: {
                    value: totalCustomers,
                    growth: customersGrowth // Dynamic growth calculation
                },
                totalProducts: totalProducts
            },
            detailedReports: {
                monthlySales: monthlySales,
                monthlyOrders: monthlyOrders,
                newCustomers: newCustomers,
                repeatCustomersPercentage: repeatCustomersPercentage
            }
        };

        // Send response
        res.status(200).json({ success: true, data: responseData });
    } catch (error) {
        // Handle specific error for Order not defined
        if (error.message.includes("Order is not defined")) {
            return res.status(500).json({ success: false, message: "Order model is not defined" });
        }
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
}


// get order status for the customers
exports.getOrderStatus = async (req, res, next) => {
    try {
        const customers = await userModel.aggregate([
            {
                $lookup: {
                    from: 'orders', // Orders collection
                    localField: '_id',
                    foreignField: 'user', // Assumes 'user' is a field in orders referencing the user ID
                    as: 'orders'
                }
            },
            {
                $match:{
                    'orders.0':{$exists:true}
                }
            },
            {
                $unwind: {
                    path: '$orders',
                    preserveNullAndEmptyArrays: true // Keep users with no orders
                }
            },
            {
                $lookup: {
                    from: 'products', // Products collection
                    localField: 'orders.products.product', // References products in orders
                    foreignField: '_id', // Match the product ID from products collection
                    as: 'productDetails'
                }
            },
            {
                $project: {
                    customerId: '$_id',
                    username: '$username', // Assumes 'name' is the user's name field
                    email:'$email',
                    orders: {
                        orderId: '$orders._id',
                        totalAmount: '$orders.totalAmount',
                        orderDate: { 
                            $dateToString: { 
                                format: "%Y-%m-%d", 
                                date: '$orders.orderDate' 
                            } 
                        }, // Format the order date as 'YYYY-MM-DD'
                        status: '$orders.status',
                        products: {
                            $map: {
                                input: '$orders.products',
                                as: 'product',
                                in: {
                                    productName: {
                                        $arrayElemAt: [
                                            {
                                                $filter: {
                                                    input: '$productDetails',
                                                    as: 'detail',
                                                    cond: { 
                                                        $eq: ['$$detail._id', '$$product.product'] 
                                                    }
                                                }
                                            },
                                            0
                                        ]
                                    },
                                    quantity: '$$product.quantity'
                                }
                            }
                        }
                    }
                }
            },
            {
                $group: {
                    _id: '$customerId', // Group by customerId to get all orders for each customer
                    username: { $first: '$username' },
                    email: { $first: '$email' },
                    orders: { $push: '$orders' } // Push all orders into an array
                }
            },
            {
                $project: {
                    customerId: '$_id',
                    username: 1,
                    email: 1,
                    orders: 1
                }
            }
        ]);

        // Prepare response
        const responseData = {
            success: true,
            data: customers.map(customer => ({
                customerId: customer.customerId,
                username: customer.username,
                email: customer.email,
                orders: customer.orders
            }))
        };

        // Send the response
        res.status(200).json(responseData);
    } catch (error) {
        // Catch and respond to any error
        const statusCode = error.status || 500;
        res.status(statusCode).json({ success: false, message: error.message });
    }
};




