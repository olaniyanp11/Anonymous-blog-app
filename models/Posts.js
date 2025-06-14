const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    username:{
        type: String,
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    image:{
        type: String,
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    comments:{
        type: Array,
        default: [{type : mongoose.Schema.Types.ObjectId, ref: 'Comment'}],
        required: false,
    },
    likes: {
        type :Array,
        default: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],   
    },
},{timestamps: true});
const Post = mongoose.model('Post', postSchema);
module.exports = Post;