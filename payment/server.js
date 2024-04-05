import bodyParser from 'body-parser';
import express from 'express';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

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

let cartHost = process.env.CART_HOST || 'cart'
let userHost = process.env.USER_HOST || 'user'

app.get('/health', (req, res) => {
    let stat = {
        app: 'OK'
    };
    res.json(stat);
});

const port = process.env.PAYMENT_SERVER_PORT || '8080';
app.listen(port, () => {
    console.log('Payment started on port', port);
});

app.post('/payment/:id', async (req, res, next) => {
    try {
        let id = req.params.id
        let cart = req.body
        let anonymousUser = true
        let { data: user } = await axios.get('http://' + userHost + ':8080/check/' + id)
        const orderUuid = uuidv4();

        // //TODO: Add payment Gateway here (stripe).
        if (!user.error) {
            anonymousUser = false
            if (cart.total == 0) {
                res.status(400).json({ error: 'Cart is not existed' })
                return;
            }

            await axios.post('http://' + userHost + ':8080/order/' + id, {
                cart: cart,
                orderId: orderUuid
            })
            console.log('PAYMENT SUCCESS', {
                cart: cart,
                orderId: orderUuid
            })
        }

        await axios.delete('http://' + cartHost + ':8080/cart/' + id)
        res.send({ 'orderId': orderUuid })
    } catch (e) {
        next(e)
    }
});

// Error handling middleware
function errorHandler(err, req, res, next) {
    // Log the error if needed
    // req.log.error('ERROR', err);

    res.status(500).send(err.message || 'Internal Server Error');
}

// Use the errorHandler middleware for all routes
app.use(errorHandler);

//TODO: Separate route file
