const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jsonwebtoken = require('jsonwebtoken');
const Post = require('../models/Posts');
const authenticateToken = require('../middlewares/checkLog');

router.get('/', (req,res)=>{
    const loggedIn = req.cookies.loggedIn || false;
    console.log('Logged In:', loggedIn);
    res.render('index', { title: 'Home', loggedIn: loggedIn, error: null  });
})
router.get('/register', (req, res) => {
    // If user is already logged in, redirect to dashboard
    if (req.cookies.token) {
        return res.redirect('/dashboard');
    }
    const loggedIn = false;
    res.render('register', { title: 'Register', error:null,loggedIn });
})

router.get('/login', async (req, res) => {
    const loggedIn = false;

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
    res.render('login', { title: 'Login', error: null, loggedIn });
});

router.get('/dashboard',authenticateToken, async (req, res) => {
    const loggedIn = req.loggedIn;
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
    res.render('protected/dashboard', { title: 'Dashboard', user: user,loggedIn: loggedIn,posts: posts, error: null  });
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


router.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.clearCookie('loggedIn');
    res.redirect('/login');
})
module.exports = router;