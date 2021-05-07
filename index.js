const express = require('express')  
const bodyParser = require('body-parser');
const { pullData } = require('./controllers/userController');
const Users = require('./models/users')
const cookieParser = require('cookie-parser');
var parseurl = require('parseurl')
var cors = require('cors')

//const session = require('cookie-session')
//const csurf = require('csurf');
const dotenv = require('dotenv');

dotenv.config();

const session = require('express-session');

let mysql = require('mysql2')

const app = express()
const port = 5000

app.use(cookieParser())
/*
app.use(session({
    name: 'session',
    secret: 'No one will know',
    saveUninitialized: true,
    resave: true,
    cookie: {
        maxAge: 1000 * 60 * 60 * 72,
        httpOnly: false,
        secure: false
    }
}))
*/
//app.use(csurf())

app.use(session({
    secret: "No one will know",
    name: 'test',
    resave: true, 
    saveUninitialized: true,
    cookie : {
        httpOnly: true,
        maxAge:(1000 * 60 * 60)
    }
}))


let SQLConnection = mysql.createConnection({
    user: process.env.DB_HOST,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
})

app.use(bodyParser.urlencoded({
    extended: true,
}));

app.use(bodyParser.json());

app.use(cors({
    credentials: true,
}));

app.get('/getSubjects', (req, res) => {
    SQLConnection.connect(err => {
        if(err) throw err
        SQLConnection.execute(`SELECT name, proffesor FROM subjects`, (err, result, fields) => {
            if(err) throw err

            SQLConnection.unprepare(`SELECT * FROM subjects`)
            res.json(result);                 
        })
    })
})

app.post('/addSubject', (req, res) => {
    SQLConnection.connect(err => {
        if(err) throw err
        SQLConnection.execute('INSERT INTO subjects (name, proffesor) VALUES (?, ?)', [
            req.body.subjectName,
            req.body.proffesor
        ], (err, result, fields) => {
            if(err) throw err
            SQLConnection.unprepare('INSERT INTO subjects (name, proffesor) VALUES (?, ?)')
        })
    })
    res.json()
})

app.get('/isLogged', (req, res) => {
    if(req.session.user)
    {
        let body = {
            redirect: false,
            userType: req.session.user.userType
        }
        res.json(body);
    }
    else
    {
        let body = {
            redirect: true,
        }
        res.json(body);
    }
})

app.post('/login', (req, res, next) => {  
    SQLConnection.connect(err => {
        if(err) throw err
        SQLConnection.execute(`SELECT * FROM users WHERE BINARY userIndex = ? AND BINARY password = ?`, [
            req.body.index,
            req.body.password
        ], (err, result, fields) => {
            if(err) throw err

            if(result.length > 0)
            {
                if(result[0].password == req.body.password && result[0].userIndex == req.body.index)
                {
                    req.session.user = result[0];
                    console.log(result);

                    SQLConnection.unprepare(`SELECT * FROM users WHERE BINARY userIndex = ? AND BINARY password = ?`)
                    res.json(true);                 
                }
            }
        })
    })
}) 

app.listen(port, '192.168.55.105', () => {
    console.log(`Works on port: ${port}`)
})