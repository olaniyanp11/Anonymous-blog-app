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


router.get('/all', async (req, res) => {
    const error = req.query.error || null;
    const posts = await Post.find().sort({ createdAt: -1 });
    console.log(error)
      const loggedIn = req.cookies.loggedIn || false;
    console.log('Fetching posts');
    res.render('posts', {title: "Posts", posts: posts, loggedIn: loggedIn, error });
})
router.get('/getOne/:id', authenticateToken,  async (req, res) => {
    const postId = req.params.id;
    console.log(`Fetching post with ID: ${postId}`);

    try {
        const post = await Post.findById({_id: postId}); // shorter & safer
        if (!post) {
          
            return res.redirect('/posts/all?error=PostNotFound');
        }

        res.render('protected/singlepost', {
            title: "Post Details",
            post,
            loggedIn: req.cookies.loggedIn || false,
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

module.exports = router;