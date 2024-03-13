const express = require('express');
// const connectDb = require('./database/database')
const user  = require('./routes/user-routes')
const cart = require('./routes/cart-routes');
const store = require('./routes/store-routes');
const product  = require('./routes/product-routes');
const order = require('./routes/order-routes');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser')

const session = require('express-session');
const { verifyAuth,isAdmin } = require('./middleware/authentication');
const app = express();

// Enable CORS
app.use(cors());
app.set('view engine', 'ejs');
app.set('views', './views');
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());
app.use(session({
    secret: 'MXIUuw6u5Ty0Ecih3XCjZ1+0575N2OTu0x9gsOl6pBc=',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set secure to true if using HTTPS
}));
require('dotenv').config();
// app.use("/files", express.static(path.join(__dirname, "files")));
app.use("/files", express.static(path.join(__dirname, "files")));


//  for the routes
app.use('/',user);
app.use('/',product);
app.use('/stores',store);
app.use('/carts',cart);
app.use('/orders',order);



app.get('/',(req,res) => {
    res.render('products');
})
app.get('/signup',(req,res) => {
    res.render('signup');
})
app.get('/login', (req, res) => {
    res.render('login');
});
app.get('/add/store', (req, res) => {
    res.render('addStore');
});


app.get('/stores/add/products',(req,res) => {
    res.render('addstoreProduct')
})

app.get('/categories',(req,res) => {
    res.render('categories');
})

app.get('/logout', verifyAuth, (req, res) => {
    // Set the JWT cookie's expiration time to a past date
    res.cookie('jwt', '', { expires: new Date(0) });
    
    // Remove the req.user object
    delete req.user;

  
    
    // Redirect the user to the login page
    res.redirect('/login');
});

app.listen(8000,() => {
    console.log(`Listening on port 8000`);
  

})