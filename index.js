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

app.post('/getSubjectsForDate', (req, res) => {
    console.log(req.session.user)

    SQLConnection.connect(err => {
        if(err) throw err
        SQLConnection.execute('SELECT * FROM subjectsschedule, subjects WHERE `group` = ? AND `semester` = ? AND subjectsschedule.subjectID = subjects.ID ORDER BY isFriday, subjectIndex', [
            req.session.user.group,
            req.session.user.semester
        ], (err, result, fields) => {
            if(err) throw err

            SQLConnection.unprepare('SELECT * FROM subjectsschedule, subjects WHERE `group` = ? AND `semester` = ? AND subjectsschedule.subjectID = subjects.ID ORDER BY isFriday, subjectIndex')
            res.json(result);                 
        })
    })
})

app.get('/getSubjects', (req, res) => {
    SQLConnection.connect(err => {
        if(err) throw err
        SQLConnection.execute(`SELECT * FROM subjects`, (err, result, fields) => {
            if(err) throw err

            SQLConnection.unprepare(`SELECT * FROM subjects`)
            res.json(result);                 
        })
    })
})

app.post('/addSemester', (req, res) => {
    SQLConnection.connect(err => {
        if(err) throw err
        SQLConnection.execute('INSERT INTO semesters (startDate, endDate) VALUES (?, ?)', [
            req.body.startDate,
            req.body.endDate,
        ], (err, result, fields) => {
            if(err) throw err
            SQLConnection.unprepare('INSERT INTO semesters (startDate, endDate) VALUES (?, ?)')
            
            res.json(result.insertId)
        })
    })
})

app.post('/addSubject', (req, res) => {
    SQLConnection.connect(err => {
        if(err) throw err
        SQLConnection.execute('INSERT INTO subjects (name, proffesor, subjectLength, color) VALUES (?, ?, ?, ?)', [
            req.body.name,
            req.body.proffesor,
            req.body.subjectLength,
            req.body.color
        ], (err, result, fields) => {
            if(err) throw err
            SQLConnection.unprepare('INSERT INTO subjects (name, proffesor, subjectLength, color) VALUES (?, ?, ?, ?)')

            res.json(result.insertId)
        })
    })
})

app.get('/getSemesters', (req, res) => {
    SQLConnection.connect(err => {
        if(err) throw err
        SQLConnection.execute(`SELECT * FROM semesters`, (err, result, fields) => {
            if(err) throw err

//            let startDate = new Date(result[0].startDate);

//            console.log(startDate.getMonth())

            SQLConnection.unprepare(`SELECT * FROM semesters`)
            res.json(result);                 
        })
    })
})

app.post('/addSubjectsToSemester', (req, res) => {

    SQLConnection.query('DELETE FROM `subjectsschedule` WHERE semester = ? AND `group` = ?', [
        req.body.semester,
        req.body.group
    ],  (err) => {
        if (err) throw err;

        if(req.body.friday.length != 0 && req.body.saturday.length != 0)
        {
            let values = [];

            for(let i = 0; i < req.body.friday.length; ++i)
            {
                values.push([req.body.friday[i], true, i, req.body.semester, req.body.group])
            }
        
            for(let i = 0; i < req.body.saturday.length; ++i)
            {
                values.push([req.body.saturday[i], false, i, req.body.semester, req.body.group])
            }
        
            console.log(values)
        
            SQLConnection.query('INSERT INTO `subjectsschedule` (subjectID, isFriday, subjectIndex, semester, `group`) VALUES ?', [values], (err) => {
                if (err) throw err;
            })
        }
    })

    res.json()
})

app.post('/addGroups', (req, res) => {
    SQLConnection.connect(err => {
        if(err) throw err
        SQLConnection.execute('INSERT INTO `groups` (groupName) VALUES (?)', [
            req.body.groupName
        ], (err, result, fields) => {
            if(err) throw err
            SQLConnection.unprepare('INSERT INTO `groups` (groupName) VALUES (?)')
        })
    })
    res.json()
})

app.get('/getGroups', (req, res) => {
    SQLConnection.connect(err => {
        if(err) throw err
        SQLConnection.execute('SELECT * FROM `groups`', (err, result, fields) => {
            if(err) throw err

            SQLConnection.unprepare('SELECT * FROM `groups`')
            res.json(result);                 
        })
    })
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

                    let redirectData = {
                        redirect: true,
                        userType: result[0].userType
                    }

                    res.json(redirectData);                 
                }
            }
        })
    })
}) 

app.listen(port, '192.168.55.109', () => {
    console.log(`Works on port: ${port}`)
})