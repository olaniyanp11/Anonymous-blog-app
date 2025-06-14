const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Posts');
const Comment = require('../models/Comment');
const authenticateToken   = require('../middlewares/checkLog');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/image/blog'); // ✅ correct
  },
  filename: function (req, file, cb) {
    // ✅ generate a complex filename string (not a function)
    const uniqueName = file.originalname.split('.')[0] + '-' + Date.now() + '-' +
      Math.random().toString(36).substring(2, 8) + path.extname(file.originalname);
    
    cb(null, uniqueName); // ✅ this is a string
  }
});

const upload = multer({ storage: storage });


router.get('/all',authenticateToken, async (req, res) => {
    const error = req.query.error || null;
    const user = req.user || null; // Get the user from the request
    const comments = await Comment.find().sort({ createdAt: -1 });
    console.log('User:', user);
    const posts = await Post.find().sort({ createdAt: -1 });
    const loggedIn = req.cookies.loggedIn || false;
    console.log('Fetching posts');
    res.render('posts', {title: "Posts", posts: posts, loggedIn: loggedIn, error,user,comments  });
})
router.get('/getOne/:id', authenticateToken,  async (req, res) => {
    const postId = req.params.id;
    console.log(`Fetching post with ID: ${postId}`);
    const comments = await Comment.find({ postId }).sort({ createdAt: -1 });

    try {
        const post = await Post.findById({_id: postId}); // shorter & safer
        if (!post) {
          
            return res.redirect('/posts/all?error=PostNotFound');
        }

        res.render('protected/singlepost', {
            title: "Post Details",
            post,
            loggedIn: req.cookies.loggedIn || false,
            comments: comments,
            user: req.user || null, // Pass the user object to the view
            error: null
        });
    } catch (err) {
        console.error(err);
        return res.status(500).send("Internal Server Error");
    }
});
router.get('/create', authenticateToken, (req, res) => {
    const error = req.query.error || null;

    res.render('protected/createpost', {title: "Create Post", loggedIn: req.cookies.loggedIn || false, error});
});
router.post('/create', authenticateToken, upload.single('image'), async (req, res) => {
    const { title, content } = req.body;
    const userId = req.user.userId;
    username = await User.findById(userId).then(user => user.username).catch(err => {
        console.error('Error fetching username:', err);
        return null; // Handle error appropriately
    });

    console.log('Creating post with data:', { title, content,file : req.file });

    if (!title || !req.file || !content) {
        return res.redirect('/posts/create?error=MissingFields');
    }
    try {
        const newPost = new Post({
            username,
            title,
            image: `${req.file.filename}`, // Use the uploaded file's name
            content,
            likes: 0,
            comments: []
        });

        await newPost.save();
        console.log('Post created successfully:', newPost);
        res.redirect('/posts/all');
    } catch (err) {
        console.error('Error creating post:', err);
        res.redirect('/posts/create?error=CreationFailed');
    }
});
// routes/posts.js
router.post('/like/:id',authenticateToken, async (req, res) => {
  try {

    if (!req.user) return res.status(401).json({ success: false, message: "Not authenticated" });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: "Post not found" });

    const userId = req.user.userId; // Assuming userId is stored in req.user
    console.log(`User ID: ${userId}, Post ID: ${post._id}`);
    const alreadyLiked = post.likes.includes(userId);

    if (alreadyLiked) {
      post.likes.pull(userId);
    } else {
      post.likes.push(userId);
    }

    await post.save();
    res.json({ success: true, liked: !alreadyLiked });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/comment/:id', authenticateToken, async (req, res) => {
    const postId = req.params.id;
    console.log(req.body);
    const { content } = req.body;
    const userId = req.user.userId;

    if (!content || !userId) {
        return res.status(400).json({ success: false, message: "Content and user ID are required" });
    }

    try {
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ success: false, message: "Post not found" });
        }
        const user = await User.findById(userId);
        const comment = new Comment({
            content,
            postId,
            username: user.username // Assuming username is stored in req.user
        });

        await comment.save();
        post.comments.push(comment._id);
        await post.save();

        res.json({ success: true, comment });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;