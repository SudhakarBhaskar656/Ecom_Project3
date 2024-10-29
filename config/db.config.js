require('dotenv').config();
const mongoose = require('mongoose');
const uri = process.env.MONGO_URL;
exports.DbConnection = async(req, res, err) => {

    await mongoose.connect(uri)
        .then(function() {
           res.json({success: true, message : "connection established"})
        })
        .catch(function(error) {
            res.json({success: false, message: error.message});
        });

}