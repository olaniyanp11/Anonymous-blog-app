const mongoose = require('mongoose');
const userSchema = mongoose.Schema({
    username : {
        type: String,
        required: true,
        unique: true,
    },
    isAdmin:{
        type: Boolean,
        default : false
    }, 
    password : {
        type: String,
        required: true
    },
}, {timestamps: true});
const User= mongoose.model('User', userSchema);
 module.exports = User;