const express = require('express');
const authRoutes = require('./auth');
const userRoute = require('./posts')
const router = express.Router();
const postRoutes = require('./posts');

router.use("/",authRoutes)
router.use("/user",authRoutes)
router.use("/posts", postRoutes);


module.exports = router;