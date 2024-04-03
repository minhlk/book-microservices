import bodyParser from 'body-parser';
import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';

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
let usersCollection;

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
    usersCollection = client.db('users').collection('users');
    // console.log( await books.find().toArray())
}

mongoLoop();

const port = process.env.CATALOGUE_SERVER_PORT || '8080';
app.listen(port, () => {
    console.log('Users started on port', port);
});

const JWT_SECRET = 'very secret key'

// Middleware to verify JWT
function verifyToken(req, res, next) {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        req.user = decoded.user;
        next();
    });
}

app.get('/user/info', verifyToken, async (req, res) => {
    // Access user information from decoded token
    let { _id } = req.user;
    if (mongoConnected) {
        let user = await usersCollection.findOne({ _id: new ObjectId(_id) })
        if (user) {
            res.json(user)
            return;
        }
    }

    res.status(500).send('database not available');
});

app.post('/login', async (req, res) => {
    // req.log.info('login', req.body);
    if (req.body.name === undefined || req.body.password === undefined) {
        // req.log.warn('credentials are not complete');
        res.status(400).send('name or password not supplied');
        return;
    }

    if (mongoConnected) {
        try {
            let user = await usersCollection.findOne({
                name: req.body.name,
            })
            // req.log.info('user', user);
            //TODO: ADD hash password
            if (user && user.password == req.body.password) {
                let token = jwt.sign({ user }, JWT_SECRET, { expiresIn: '1h' });
                user.token = token
                res.json(user);
                return;
            }

            res.status(404).send('user or password is not correct');
            return;
        } catch (e) {
            // req.log.error('ERROR', e);
            res.status(500).send(e);
            return;
        }
    }

    // req.log.error('database not available');
    res.status(500).send('database not available');
});

//TODO: - validate email address format
app.post('/register', async (req, res) => {
    // req.log.info('register', req.body);
    if (req.body.name === undefined || req.body.password === undefined || req.body.email === undefined) {
        // req.log.warn('insufficient data');
        res.status(400).send('insufficient data');
        return;
    }

    if (mongoConnected) {
        try {
            // check if name already exists
            let user = await usersCollection.findOne({ name: req.body.name })
            if (user) {
                // req.log.warn('user already exists');
                res.status(400).send('name already exists');
            } else {
                // create new user
                let user = usersCollection.insertOne({
                    name: req.body.name,
                    password: req.body.password,
                    email: req.body.email
                })
                // req.log.info('inserted', r.result);
                res.send('OK');
                return;
            }
        } catch (e) {
            // req.log.error('ERROR', e);
            res.status(500).send(e);
            return;
        }
    }

    // req.log.error('database not available');
    res.status(500).send('database not available');
});

//TODO: Add Typescript
//TODO: Add get book orders
//TODO: Separate route file
