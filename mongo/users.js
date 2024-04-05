//
// Books
//
db = db.getSiblingDB('BookShop');
db.users.insertMany([
    {name: 'admin', password: 'password', email: 'admin@mail.com'},
    {name: 'user', password: 'bigbrain', email: 'user@mail.com'},
    {name: 'partner-57', password: 'worktogether', email: 'howdy@partner.com'}
]);

// unique index on the name
db.users.createIndex(
    {name: 1},
    {unique: true}
);
