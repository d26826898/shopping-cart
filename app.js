const express = require("express");
const engine = require('ejs-mate');
const app = express();
const methodOverride = require('method-override');
const session = require('express-session');
const Product = require('./models/product');
const Cart = require('./models/cart');
const User = require('./models/user');

const mongoose = require('mongoose');
const passport = require("passport");

main().catch(err => console.log(err))
    .then(console.log('connected to mongoDB'));

async function main() {
    await mongoose.connect('mongodb://localhost:27017/test');
}

app.engine('ejs', engine);

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.use(methodOverride('_method'));
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
}))

app.use(passport.initialize());
app.use(passport.session());

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    next();
})

app.get('/', (req, res) => {
    res.send('Home page');
});

app.get('/products', async (req, res) => {
    const products = await Product.find({});
    res.render('products/index', { products });
});

app.get('/products/new', (req, res) => {
    res.render('products/new');
});

app.post('/products', async (req, res) => {
    const product = new Product({ ...req.body.product, author: req.user._id });
    console.log(product);
    await product.save();
    res.redirect('/products');
});

app.get('/products/:id', async (req, res) => {
    const { id } = req.params;
    const product = await Product.findById(id);
    var cartQuantity = 0;
    if (req.session.cartId) {
        const cart = await Cart.findOne({ _id: req.session.cartId });
        const prod = cart.user.find(prod => prod.product == id);
        if (prod) {
            cartQuantity = prod.quantity;
        }
    }

    res.render('products/show', { product, cartQuantity });
});

app.get('/products/:id/edit', async (req, res) => {
    const { id } = req.params;
    const product = await Product.findById(id);
    res.render('products/edit', { product });
})

app.delete('/products/:id', async (req, res) => {
    const { id } = req.params;
    await Product.findByIdAndDelete(id);
    res.redirect('/manage');
})

app.put('/products/:id', async (req, res) => {
    const { id } = req.params;
    await Product.findByIdAndUpdate(id, req.body.product);
    res.redirect(`/manage`);
})

app.post('/cart', async (req, res) => {

    const cartId = req.user ? req.user._id : req.session.cartId;
    const cart = await Cart.findById(cartId);

    if (!cart) {
        if (req.user) {
            const cart = new Cart({ user: req.body.cart, _id: req.user._id });
            await cart.save();
        }
        else {
            const cart = new Cart({ user: req.body.cart });
            await cart.save();
            req.session.cartId = cart._id;
        }

    }
    else {
        const productId = req.body.cart.product;
        const prod = cart.user.find(prod => prod.product == productId);

        //if the product is already in shopping cart, then find it and update the quantity
        if (prod) {
            await Cart.updateOne({ _id: cartId, 'user.product': productId }, {
                '$set': {
                    'user.$.quantity': Number(prod.quantity) + Number(req.body.cart.quantity)
                }
            });
        }
        //else, just push the new product into shopping cart
        else {
            cart.user.push(req.body.cart);
            await cart.save();
        }
    }

    res.redirect(`/products/${req.body.cart.product}`);
})

app.get('/cart', async (req, res) => {
    const cartId = req.user ? req.user._id : req.session.cartId;
    const cart = await Cart.findById(cartId).populate('user.product');
    res.render('cart', { cart });
})

app.delete('/cart/:productId', async (req, res) => {
    const { productId } = req.params;
    const cartId = req.user ? req.user._id : req.session.cartId;
    await Cart.updateOne({ _id: cartId }, { "$pull": { "user": { "product": productId } } });
    res.redirect('/cart');
})

app.get('/register', (req, res) => {
    res.render('users/register');
})

app.post('/register', async (req, res) => {
    const { email, username, password } = req.body;
    await User.register({ username, email }, password);
    res.redirect('/products');
})

app.get('/login', (req, res) => {
    res.render('users/login');
})

app.post('/login',
    passport.authenticate('local', { failureRedirect: '/login' }),
    (req, res) => {
        res.redirect('/products');
    })


app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/products');
})

app.get('/manage', async (req, res) => {
    const products = await Product.find({ author: req.user._id });
    res.render('manage', { products });
})



app.listen(3000);