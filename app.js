const express = require('express');
const session = require('express-session');
var passport = require('passport');
const morgan = require('morgan');
const favicon = require('serve-favicon');
var routes = require('./routes/index');
const database = require('./config/database');
require('dotenv').config();
require('./config/passport');


const connection = database.c1;
const MongoStore = require('connect-mongo')(session);
const sessionStore = new MongoStore({ mongooseConnection: connection, collection: 'sessions' });
var app = express();

app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(morgan('dev'));
app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24
    }
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(favicon(__dirname + '/public/images/icon.ico'));
app.use(routes);
app.use((req, res)=>{
    res.status(404).render('404', {page: '404'});
});

app.listen(process.env.PORT || 3000);