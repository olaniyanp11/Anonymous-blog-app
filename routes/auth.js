const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jsonwebtoken = require('jsonwebtoken');
const Post = require('../models/Posts');
const authenticateToken = require('../middlewares/checkLog');
const isAdmin = require('../middlewares/isAdmin');
const fs = require('fs');

router.get('/', (req,res)=>{
    const loggedIn = req.cookies.loggedIn || false;
    const isAdmin = req.cookies.isAdmin || false;
    console.log('Logged In:', loggedIn);
    res.render('index', { title: 'Home', loggedIn: loggedIn, error: null,isAdmin  });
})
router.get('/register', (req, res) => {
    // If user is already logged in, redirect to dashboard
    if (req.cookies.token) {
        return res.redirect('/dashboard');
    }
    const isAdmin =  false;
    const loggedIn = false;
    res.render('register', { title: 'Register', error:null,loggedIn, isAdmin  });
})

router.get('/login', async (req, res) => {
    const loggedIn = false;
    const isAdmin = false;
    // Check if token exists in cookie
    if (req.cookies.token) {
        try {
            // Verify the token
            const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET);

            // Check if user still exists in DB
            const user = await User.findById(decoded.userId);
            if (user) {
                // Valid token and user found, redirect to dashboard
                return res.redirect('/dashboard');
            } else {
                // Token is valid but user no longer exists (e.g. DB deleted)
                res.clearCookie('token');
            }
        } catch (err) {
            // Token is invalid or expired
            res.clearCookie('token');
        }
    }

    // Render login page
    res.render('login', { title: 'Login', error: null, loggedIn,isAdmin  });
});

router.get('/dashboard',authenticateToken, async (req, res) => {
    const loggedIn = req.loggedIn;
    const isAdmin = req.isAdmin || false;
    console.log('Logged In dash:', loggedIn);
    if (!loggedIn) {
        res.clearCookie('token');
        res.clearCookie('loggedIn');
        req.cookies.token = null;
        return res.redirect('/login');
    }
    const user = await User.findById(req.user.userId);
    if (!user) {
        return res.redirect('/login');
    }
    const posts = await Post.find({username : user.username}).sort({ createdAt: -1 });
    res.render('protected/dashboard', { title: 'Dashboard', user: user,loggedIn: loggedIn,posts: posts, error: null, isAdmin: isAdmin  });
})
// post routes 
router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const existingUser = await User.findOne({ username: username });
        if (existingUser) {
            return res.render('register', { title: 'Register', error: 'username already exists.', loggedIn: false });
        }
        if (password.length < 6) {
            return res.render('register', { title: 'Register', error: 'Password must be at least 6 characters long.', loggedIn: false });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            username: username,
            password: hashedPassword
        });
        await newUser.save();
        res.render('login', { title: 'Login', error: null, loggedIn: false });
    }
    catch(error){
        console.error(error);
        res.render('register', { title: 'Register', error: 'An error occurred while registering.',loggedIn: false });
    }
})

router.post('/login', async (req, res) => {
  
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username:username});
        if (!user) {
            return res.render('login', { title: 'Login', error: 'Invalid username or password.', loggedIn: false });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.render('login', { title: 'Login', error: 'Invalid username or password.', loggedIn: false });
        }
        const token = jsonwebtoken.sign({ userId: user._id }, 'your_jwt_secret', { expiresIn: '1h' });

        const loggedIn = true;
        // Set the token in a cookie
        res.cookie('loggedIn', loggedIn, { httpOnly: true });
        // Set the token in a cookie
        res.cookie('token', token, { httpOnly: true });
        res.redirect('/dashboard');
    }catch(error){
        res.render('login', { title: 'Login', error: 'An error occurred while logging in.', loggedIn: false });
    }
})

router.post('/admin/promote/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isAdmin: true },
      { new: true }
    );

    if (!user) return res.status(404).send('User not found');

    res.send(`${user.username} is now an admin.`);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

router.get('/admin/users', authenticateToken, isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        const isAdmin = req.isAdmin || false;
        const users = await User.find().select('-password'); // Exclude password field
        res.render('protected/admin/allUsers', { title: 'Users',user, users: users, loggedIn: req.loggedIn, isAdmin });
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).send('Server error');
    }
})

router.get('/admin/users/makeadmin/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({message: 'User not found'});
        }
        user.isAdmin = true;
        await user.save();
        res.redirect('/admin/users');
    } catch (err) {
        console.error('Error promoting user:', err);
        res.status(500).send('Server error');
    }
})
// remove admin status
router.get('/admin/users/removeadmin/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({message: 'User not found'});
        }
        user.isAdmin = false;
        await user.save();
        res.redirect('/admin/users');
    } catch (err) {
        console.error('Error removing admin status:', err);
        res.status(500).send('Server error');
    }
})

// delete user
router.get('/admin/users/delete/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({message: 'User not found'});
        }
        const posts = await Post.find({ username: user.username });
        //delete all images associated with the posts
        for (const post of posts) {

            if (post.image) {
                const imagePath = `public/image/blog/${post.image}`;
                try {
                    fs.unlinkSync(imagePath);
                } catch (err) {
                    console.error('Error deleting image:', err);
                }
            }
            // delete comments associated with the posts
            await Comment.deleteMany({ postId: post._id });
            await Post.findByIdAndDelete(post._id);
            console.log(`Deleted post and comments for user: ${user.username}`);
        }
        res.redirect('/admin/users');
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).send('Server error');
    }
})
router.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.clearCookie('loggedIn');
    res.redirect('/login');
})
module.exports = router;