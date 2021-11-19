const express = require("express");
const engine = require('ejs-mate');
const app = express();
const methodOverride = require('method-override');
const session = require('express-session');
const Product = require('./models/product');
const Cart = require('./models/cart');

const mongoose = require('mongoose');

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
    const product = new Product(req.body.product);
    await product.save();
    res.redirect('/products');
});

app.get('/products/:id', async (req, res) => {
    const { id } = req.params;
    const product = await Product.findById(id);
    res.render('products/show', { product });
});

app.get('/products/:id/edit', async (req, res) => {
    const { id } = req.params;
    const product = await Product.findById(id);
    res.render('products/edit', { product });
})

app.delete('/products/:id', async (req, res) => {
    const { id } = req.params;
    await Product.findByIdAndDelete(id);
    res.redirect('/products');
})

app.put('/products/:id', async (req, res) => {
    const { id } = req.params;
    await Product.findByIdAndUpdate(id, req.body.product);
    res.redirect(`/products/${id}`);
})

app.post('/cart', async (req, res) => {

    if (!req.session.cartId) {
        const cart = new Cart({ user: req.body.cart });
        await cart.save();
        req.session.cartId = cart._id;
    }
    else {
        const cart = await Cart.findById(req.session.cartId);
        cart.user.push(req.body.cart);
        await cart.save();
    }
    res.redirect(`/products/${req.body.cart.product}`);
})

app.get('/cart', async (req, res) => {
    const cart = await Cart.findById(req.session.cartId).populate('user.product');
    console.log(cart);
    res.render('cart', { cart });
})

app.delete('/cart/:productId', async (req, res) => {
    const { productId } = req.params;
    await Cart.updateOne({ _id: req.session.cartId }, { "$pull": { "user": { "product": productId } } });
    res.redirect('/cart');
})


app.listen(3000);