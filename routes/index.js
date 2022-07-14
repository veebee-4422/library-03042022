const router = require('express').Router();
const passport = require('passport');
const multer = require('multer');
const mongoose = require('mongoose');
const {GridFsStorage} = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const genPassword = require('../lib/passwordUtils').genPassword;
const database = require('../config/database');
const getSetCache = require('../lib/cache').getSetCache;
const dropCache = require('../lib/cache').dropCache;

const connection = database.c1;
const User = connection.models.User;
const Book = connection.models.Book;

let gfs;
connection.once('open', () => {
    gfs = Grid(connection.db, mongoose.mongo);
    gfs.collection('docs');
});
const storage = new GridFsStorage({
    db: connection,
    file: (req, file) => {
        date = Date.now();
        req.body.update = date;
        if (file.mimetype === 'application/pdf') {
            req.body.safe = true;
            return {
              filename: date + '.pdf',
              bucketName: 'docs'
            };
        }
        else{
            req.body.safe = false;
            return null;
        }
      } 
});
const upload = multer({storage: storage});

// -------------- POST ROUTES ----------------

 router.post('/login', passport.authenticate('local', { failureRedirect: '/login?alert=1', successRedirect: '/login' }));

 router.post('/register', (req, res, next) => {
    
    const saltHash = genPassword(req.body.password);
    
    const salt = saltHash.salt;
    const hash = saltHash.hash;

    const newUser = new User({
        username: req.body.username,
        hash: hash,
        salt: salt,
        admin: true
    });
    User.findOne({username: newUser.username})
        .then((user)=>{
            if(!user){
                newUser.save();
                res.redirect('/login?alert=2');
            } else {
                res.redirect('/login?alert=3');
            }
        })
        .catch((err) => {
            console.log(err);
            res.status(404).render('404', {page: '404'});
        });
    
  
 });
 router.post('/upload-file', upload.single('file'), (req, res, next) => {
    if(!req.body.safe){
        res.redirect('/upload-file?alert=5');
    }
    else{
        const newBook = new Book({
            title: req.body.title,
            desc: req.body.desc,
            pubdate: req.body.pubdate,
            authour: req.body.authour,
            uploaderid: req.user.id,
            update: req.body.update
        });
        Book.findOne({
            title: newBook.title,
            desc: newBook.desc,
            pubdate: newBook.pubdate,
            authour: newBook.authour,
            uploaderid: newBook.uploaderid,
            update: newBook.update
        })
        .then((book)=>{
            if(!book){
                newBook.save()
            }
        })
        .then(dropCache())
        .catch((err) => {
            console.log(err);
            res.status(404).render('404', {page: '404'});
        });
    
    res.redirect('/upload');
    }
 });
 router.post('/search', (req, res, next)=>{
    const keywords = req.body.keywords;
    Book
    .aggregate([
        { 
            $search: { 
                index: 'book_index_v2',
                "compound": {
                    "should":[
                        {
                            "wildcard": {
                            "query": `*${keywords}*`,
                            "path": {
                                    'wildcard': '*'
                                    },
                            allowAnalyzedField: true
                            }
                        },
                        {
                         text: {
                           query: `*${keywords}*`,
                           path: {
                            'wildcard': '*'
                          },
                           fuzzy: {
                               'maxEdits':2
                            }
                         }
                       }
                     ]
                 }
            } 
        }
      ])
    .then((result)=>{
        res.render('search-results', {books: result, key: keywords, logged: req.isAuthenticated(), page: 'search'});
    })
    .catch((err) => {
        console.log(err);
        res.status(404).render('404', {page: '404'});
    });;

})

// -------------- GET ROUTES ----------------

router.get('/', (req, res, next) => {
    res.render('about', {books: [], logged: req.isAuthenticated(), page: 'about'});
}) ;
router.get('/browse', async(req, res, next) => {
    getSetCache('books', ()=>{
        return new Promise((resolve, reject)=>{
            Book.find().sort({createdAt: -1})
            .then(result=>{return resolve(result)})
            .catch(error=>{return reject(error)})
        })
    })
    .then((books)=>{
        res.render('browse', {books: books, logged: req.isAuthenticated(), page: 'browse'});
    })
    .catch((err) => {
        console.log(err);
        res.status(404).render('404', {page: '404'});
    });
});
router.get('/browse/:id', (req, res, next) =>{
    const id = req.params.id;
    getSetCache('books', ()=>{
        return new Promise((resolve, reject)=>{
            Book.find().sort({createdAt: -1})
            .then(result=>{return resolve(result)})
            .catch(error=>{return reject(error)})
        })
    })
    .then((books)=>{
        books.forEach(book => {
            if(book._id == id){
                res.render('browse-details', {book: book, logged: req.isAuthenticated(), page: 'browse'});
            }
        });
    })
    .catch((err) => {
        console.log(err);
        res.status(404).render('404', {page: '404'});
    });
});
router.get('/login', (req, res, next) => {
    if (req.isAuthenticated()) {
        res.redirect('/');
    } else {
        res.render('login', {page: 'login', alertCode: req.query.alert});
    }
});
router.get('/register', (req, res, next) => {
    if (req.isAuthenticated()) {
        res.redirect('/logout');
    } else {
        res.render('register', {page: 'login'});
    } 
});
router.get('/upload', (req, res, next) => {
    getSetCache('books', ()=>{
        return new Promise((resolve, reject)=>{
            Book.find().sort({createdAt: -1})
            .then(result=>{return resolve(result)})
            .catch(error=>{return reject(error)})
        })
    })
    .then((books)=>{
        if (req.isAuthenticated()) {
            res.render('upload', {user: req.user, books: books, logged: true, page: 'upload'});
        } else {
            res.redirect('/login?alert=4');
        }
    })
    .catch((err) => {
        console.log(err);
        res.status(404).render('404', {page: '404'});
    });
});
router.get('/upload/:id', (req, res, next) =>{
    const id = req.params.id;
    getSetCache('books', ()=>{
        return new Promise((resolve, reject)=>{
            Book.find().sort({createdAt: -1})
            .then(result=>{return resolve(result)})
            .catch(error=>{return reject(error)})
        })
    })
    .then((books)=>{
        books.forEach(book => {
            if(book._id == id){
                if (req.isAuthenticated()) {
                    res.render('upload-details', {book: book, logged: true, page: 'upload' });
                } else {
                    res.redirect('/login?alert=6');
                }
            } else {
            }
        });
    })
    .catch((err) => {
        console.log(err);
        res.status(404).render('404', {page: '404'});
    });
});
router.get('/file/:update', (req, res, next) =>{
    gfs.files.findOne({filename: req.params.update + '.pdf'}, (err, file)=>{
        if(file && file.contentType == 'application/pdf'){
            const readstream = gfs.createReadStream(file.filename);
            readstream.pipe(res);
        }
        else{
            res.status(404).render('404', {page: '404'});
        }
    });


});
router.get('/search', (req, res, next)=>{
    res.render('search', {logged: req.isAuthenticated(), page: 'search'});
})
router.get('/upload-file', (req, res, next) => {
    if (req.isAuthenticated()) {
        res.render('upload-file', {page: 'upload', alertCode: req.query.alert});
    } else {
        res.redirect('/login');
    }
});
router.get('/logout', (req, res, next) => {
    req.logout();
    res.redirect('/login');
});
// -------------- DELETE ROUTE ----------------

router.get('/delete', (req, res) =>{
    const id = req.query.ID;
    const update = req.query.UD;
    Book.findByIdAndDelete(id)
    .then(dropCache())
    .then(gfs.remove({filename: update + '.pdf', root: 'docs'}))
    .then((result)=>{
        res.redirect('/upload');
    })
    .catch((err) => {
        console.log(err);
        res.status(404).render('404', {page: '404'});
    });
});

module.exports = router;