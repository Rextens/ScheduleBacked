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
        maxAge:(1000 * 60)
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

app.get('/isLogged', (req, res) => {
    if(req.session.user)
    {
        console.log('false')
        res.json(false);
    }
    else
    {
        console.log('true')
        res.json(true);
    }
})

app.post('/login', (req, res, next) => {  
    /*
    if(req.session.page_views)
    {
        req.session.page_views++;
        console.log(req.session.page_views);
    } else {
        req.session.page_views = 1;
    }
    */

  //  let prepareState = new mysql.PreparedStatement(SQLConnection);
   // prepareState.input('index', mysql.String);

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
                    req.session.user = result;
                    console.log(result);

                    SQLConnection.unprepare(`SELECT * FROM users WHERE BINARY userIndex = ? AND BINARY password = ?`)
                    res.json(true);

                    next()
                }
            }
        })
       // SQLConnection.close();
    })

    //res.json(false)
}) 

app.listen(port, '192.168.55.105', () => {
    console.log(`Works on port: ${port}`)
})