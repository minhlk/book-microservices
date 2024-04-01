//
// Books
//
db = db.getSiblingDB('BookShop');
db.books.insertMany([
    {sku: 'LoveInParis', name: 'Love in Paris', description: 'A captivating tale of love and adventure set in the romantic streets of Paris', price: 12.99, instock: 10, categories: ['Romance', 'Contemporary Fiction']},
    {sku: 'ForeverYours', name: 'Forever Yours', description: 'A heartwarming story of enduring love and second chances', price: 9.99, instock: 8, categories: ['Romance', 'Women\'s Fiction']},
    {sku: 'SummerRomance', name: 'Summer Romance', description: 'Sweeping romance unfolds against the backdrop of a sun-drenched beach resort', price: 14.99, instock: 6, categories: ['Romance', 'Summer Reads']},
    {sku: 'TheNotebook', name: 'The Notebook', description: 'A timeless romance that transcends the barriers of time and memory', price: 11.99, instock: 7, categories: ['Romance', 'Classic Literature']},
    {sku: 'UnexpectedLove', name: 'Unexpected Love', description: 'An emotional rollercoaster of unexpected encounters and undeniable chemistry', price: 10.99, instock: 9, categories: ['Romance', 'Drama']},
    {sku: 'AWhiskerAway', name: 'A Whisker Away', description: 'Quirky and heartwarming, this romance follows a girl who transforms into a cat to get closer to her crush', price: 16.99, instock: 5, categories: ['Romance', 'Young Adult']},
    {sku: 'RomanceByTheFire', name: 'Romance by the Fire', description: 'Passion ignites between two unlikely souls as they find warmth in each other\'s arms', price: 13.99, instock: 11, categories: ['Romance', 'Historical Fiction']},
    {sku: 'LoveLetters', name: 'Love Letters', description: 'A collection of heartfelt letters that express the depths of love and longing', price: 8.99, instock: 12, categories: ['Romance', 'Anthology']},
    {sku: 'FallingForYou', name: 'Falling For You', description: 'A charming romance blossoms amidst the beauty of a quaint countryside town', price: 15.99, instock: 6, categories: ['Romance', 'Small Town Romance']},
    {sku: 'EternalLove', name: 'Eternal Love', description: 'A tale of eternal love that spans across lifetimes, testing the boundaries of fate and destiny', price: 17.99, instock: 4, categories: ['Romance', 'Fantasy']}
]);

// full text index for searching
db.books.createIndex({
    name: "text",
    description: "text"
});

// unique index for book sku
db.books.createIndex(
    { sku: 1 },
    { unique: true }
);

