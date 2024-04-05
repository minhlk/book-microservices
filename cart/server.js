import bodyParser from 'body-parser';
import express from 'express';
import axios from 'axios';
import { createClient } from 'redis';

const app = express()

app.use((req, res, next) => {
    res.set('Timing-Allow-Origin', '*');
    res.set('Access-Control-Allow-Origin', '*');
    next();
});

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }))

// parse application/json
app.use(bodyParser.json())

let redisConnected = false;
let redisHost = process.env.REDIS_HOST || 'redis'
let bookHost = process.env.BOOK_HOST || 'books'

app.get('/health', (req, res) => {
    let stat = {
        app: 'OK',
        mongo: redisConnected
    };
    res.json(stat);
});

//TODO: Add authentication for redis
const port = process.env.CATALOGUE_SERVER_PORT || '8080';
app.listen(port, () => {
    console.log('Cart started on port', port);
});
    
const redisClient = await createClient({
    url: `redis://${redisHost}:6379`
}).on('error', err => console.log('Redis Client Error', err))
.connect();;

redisClient.on('error', (e) => {
    console.log('Redis ERROR', e)
    // logger.error('Redis ERROR', e);
});
redisClient.on('ready', (r) => {
    console.log('Redis READY', r)
    // logger.info('Redis READY', r);
    redisConnected = true;
});


// get cart with id
app.get('/cart/:id', async (req, res) => {
    try {
        let data = await redisClient.get(req.params.id)
        if(data == null) {
            res.status(404).send('cart not found');
        } else {
            res.set('Content-Type', 'application/json');
            res.send(data);
        }
    } catch (e) {
        // req.log.error('ERROR', err);
        res.status(500).send(e);
    }
});

app.delete('/cart/:id', async (req, res) => {
    try {
        let data = await redisClient.del(req.params.id)
        if(data == 1) {
            res.send('OK');
        } else {
            res.status(404).send('cart not found');
        }
    } catch (e) {
        // req.log.error('ERROR', err);
        res.status(500).send(e);
    }
});

app.get('/add/:id/:sku/:qty', async (req, res) => {
    // check quantity
    let qty = parseInt(req.params.qty);
    if(isNaN(qty)) {
        // req.log.warn('quantity not a number');
        res.status(400).send('quantity must be a number');
        return;
    } else if(qty < 1) {
        // req.log.warn('quantity less than one');
        res.status(400).send('quantity has to be greater than zero');
        return;
    }
        
    try {
        // look up book details
        let book = await getBook(req.params.sku)
        // req.log.info('got book', book);
        if(!book) {
            res.status(404).send('book not found');
            return;
        }
        // is the book in stock?
        if(book.instock == 0) {
            res.status(404).send('out of stock');
            return;
        }

        // does the cart already exist?
        let data = await redisClient.get(req.params.id);
        let cart;
        if(data == null) {
            // create new cart
            cart = {
                total: 0,
                tax: 0,
                items: []
            };
        } else {
            cart = JSON.parse(data);
        }
        // req.log.info('got cart', cart);
        // add sku to cart
        let item = {
            qty: qty,
            sku: req.params.sku,
            name: book.name,
            price: book.price,
            subtotal: qty * book.price
        };
        let list = mergeList(cart.items, item, qty);
        cart.items = list;
        cart.total = calcTotal(cart.items);
        // work out tax
        cart.tax = calcTax(cart.total);

        // save the new cart
        await saveCart(req.params.id, cart)
        // counter.inc(qty);
        res.json(cart);

    } catch (e) {
        // req.log.error(err);
        console.log(e)
        res.status(500).send(e);
    }
});

// update quantity - remove item when qty == 0
app.get('/update/:id/:sku/:qty', async (req, res) => {
    // check quantity
    let qty = parseInt(req.params.qty);
    if(isNaN(qty)) {
        req.log.warn('quantity not a number');
        res.status(400).send('quantity must be a number');
        return;
    } else if(qty < 0) {
        req.log.warn('quantity less than zero');
        res.status(400).send('negative quantity not allowed');
        return;
    }

    // get the cart
    try {
        let data = await redisClient.get(req.params.id)
        if(data == null) {
            res.status(404).send('cart not found');
        } else {
            let cart = JSON.parse(data);
            let idx;
            let len = cart.items.length;
            for(idx = 0; idx < len; idx++) {
                if(cart.items[idx].sku == req.params.sku) {
                    break;
                }
            }
            if(idx == len) {
                // not in list
                res.status(404).send('not in cart');
            } else {
                if(qty == 0) {
                    cart.items.splice(idx, 1);
                } else {
                    cart.items[idx].qty = qty;
                    cart.items[idx].subtotal = cart.items[idx].price * qty;
                }
                cart.total = calcTotal(cart.items);
                // work out tax
                cart.tax = calcTax(cart.total);
                await saveCart(req.params.id, cart)
                res.json(cart);
            }
        }
    } catch (e) {
        // req.log.error(e);
        console.log(e)
        res.status(500).send(e);
    }
});

function mergeList(list, book, qty) {
    let inList = false;
    // loop through looking for sku
    let idx;
    let len = list.length;
    for(idx = 0; idx < len; idx++) {
        if(list[idx].sku == book.sku) {
            inList = true;
            break;
        }
    }

    if(inList) {
        list[idx].qty += qty;
        list[idx].subtotal = list[idx].price * list[idx].qty;
    } else {
        list.push(book);
    }

    return list;
}

function calcTotal(list) {
    let total = 0;
    for(let idx = 0, len = list.length; idx < len; idx++) {
        total += list[idx].subtotal;
    }

    return total;
}

function calcTax(total) {
    // tax @ 20%
    return (total - (total / 1.2));
}

async function getBook(sku) {
    try {
        let res = await axios.get('http://' + bookHost + ':8080/book/' + sku, {
            validateStatus: function (status) {
                return status == 200
            }
        })
        return res.data
    } catch(e) {
        return e
    }
}

async function saveCart(id, cart) {
    // logger.info('saving cart', cart);
    try {
        await redisClient.set(id, JSON.stringify(cart), {EX: 3600})
    } catch(e) {
        console.log(e)
        return e
    }
}

//TODO: Separate route file
