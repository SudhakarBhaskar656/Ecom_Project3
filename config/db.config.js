require('dotenv').config();
const mongoose = require('mongoose');
const uri = process.env.MONGO_URL;
exports.DbConnection = async(req, res, err) => {

    await mongoose.connect(uri)
        .then(function() {
            console.log("DB connected successfully.");
        })
        .catch(function(error) {
            console.log("There was an Error while connecting to a database.", error);
        });

}