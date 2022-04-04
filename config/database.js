const mongoose = require('mongoose');
require('dotenv').config();

const URI = process.env.DB_STRING;
// const conn2 = process.env.DB_STRING2;

const connection = mongoose.createConnection(URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
// const connection2 = mongoose.createConnection(conn2, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true
// });

const UserSchema = new mongoose.Schema({
    username: String,
    hash: String,
    salt: String,
    admin: Boolean
});
const BookSchema = new mongoose.Schema({
    title: String,
    desc: String,
    pubdate: String,
    authour: String,
    uploaderid: String,
    update: String
});

const User = connection.model('User', UserSchema);
const Book = connection.model('Book', BookSchema);

module.exports = {c1: connection};
