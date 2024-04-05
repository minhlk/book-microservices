import bodyParser from 'body-parser';
import express from 'express';
import { MongoClient } from 'mongodb';

const app = express()
let mongoConnected = false;

app.use((req, res, next) => {
    res.set('Timing-Allow-Origin', '*');
    res.set('Access-Control-Allow-Origin', '*');
    next();
});

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }))

// parse application/json
app.use(bodyParser.json())

app.get('/health', (req, res) => {
    var stat = {
        app: 'OK',
        mongo: mongoConnected
    };
    res.json(stat);
});

const user = process.env.MONGO_INITDB_ROOT_USERNAME || '';
const password = process.env.MONGO_INITDB_ROOT_PASSWORD || '';
const mongoPort = process.env.MONGO_INITDB_PORT || 27017;

const url = `mongodb://${user}:${password}@mongodb:${mongoPort}`;
const client = new MongoClient(url);
let collection;

// mongodb connection retry loop
function mongoLoop() {
    mongoConnect()
    .then(() => {
        mongoConnected = true;
    })
    .catch((e) => {
        console.error(e)
        setTimeout(mongoLoop, 2000);
    })
}

async function mongoConnect() {
    await client.connect();
    console.log('Connected successfully to server');
    collection = client.db('BookShop').collection('books');
    // console.log( await books.find().toArray())
}

mongoLoop();

const port = process.env.CATALOGUE_SERVER_PORT || '8080';
app.listen(port, () => {
    console.log('Books started on port', port);
});

// Get book by sku
app.get('/book/:sku', async (req, res) => {
    if(mongoConnected) {
        try {
            let book = await collection.findOne({sku: req.params.sku})
            res.json(book);
        } catch(e) {
            // req.log.error('ERROR', e);
            res.status(500).send(e);
        }
    } else {
        // req.log.error('database not available');
        res.status(500).send('database not available');
    }
});

app.get('/books', async (req, res) => {
    if(mongoConnected) {
        try {
            //Search by category
            if (req.query.category !== undefined) {
                let books = await collection.find({
                    categories: { $in: [req.query.category] }
                }).toArray()
                res.json(books);
            } else {
                let books = await collection.find().toArray();
                res.json(books);
            }
        } catch(e) {
            // req.log.error('ERROR', e);
            res.status(500).send(e);
        }
    } else {
        // req.log.error('database not available');
        res.status(500).send('database not available');
    }
});

app.get('/categories', async (req, res) => {
    if(mongoConnected) {
        try {
            let cats = await collection.distinct('categories');
            res.json(cats);
        } catch(e) {
            // req.log.error('ERROR', e);
            res.status(500).send(e);
        }
    } else {
        // req.log.error('database not available');
        res.status(500).send('database not available');
    }
});

app.get('/search', async (req, res) => {
    if(mongoConnected) {
        try {
            //Search by keywords
            let books = await collection.find({
                '$text': { '$search': req.query.keywords ?? '' }
            }).toArray()
            res.json(books);
        } catch(e) {
            // req.log.error('ERROR', e);
            res.status(500).send(e);
        }
    } else {
        // req.log.error('database not available');
        res.status(500).send('database not available');
    }
});


//TODO: Separate route file
