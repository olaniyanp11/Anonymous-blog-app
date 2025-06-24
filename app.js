const express = require('express');
const path = require('path');
const route = require('./routes/route');
const morgan = require('morgan');
const mongoose = require('mongoose');
const cookieparser = require('cookie-parser');
const dotenv = require('dotenv')
dotenv.config()


const app = express();


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static('public'));
app.use(morgan('tiny'));
app.use(cookieparser());
app.use('/', route);


app.use((req, res, next)=>{
    const loggedIn = req.cookies.loggedIn || false;
    const isAdmin = req.isAdmin || false;
    res.locals.loggedIn = loggedIn; // Make loggedIn available in all views
    res.render('404', { title: '404 Not Found',isAdmin, loggedIn });
})

app.listen(3000,
    () => {
        console.log('🚀 Server running on http://localhost:3000')
       mongoose.connect(process.env.dbURL).then(()=>{
            console.log('✅ Connected to MongoDB');
        }).catch((err)=>{
            console.error('❌ Error connecting to MongoDB:', err);
        });
    });