const mongoose = require('mongoose');
const commentSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true,
    },
    postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        required: true,
    },
    username: {
        type: String,
        required: true,
    },
}, {timestamps: true});
const Comment = mongoose.model('Comment', commentSchema);
module.exports = Comment;