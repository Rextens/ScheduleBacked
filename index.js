const express = require('express')  
const bodyParser = require('body-parser');
const { pullData } = require('./controllers/userController');
const Users = require('./models/users')
const cookieParser = require('cookie-parser');
var parseurl = require('parseurl')
var cors = require('cors')
const fetch = require("node-fetch");

//const session = require('cookie-session')
//const csurf = require('csurf');
const dotenv = require('dotenv');

dotenv.config();

const session = require('express-session');

let mysql = require('mysql2');
const { default: axios } = require('axios');
const md5 = require('md5');

const app = express()
const port = 5000

app.use(cookieParser())

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


let SQLConnection = mysql.createPool({
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

app.get('/getSubjectsForProffesor', async (req, res) => {
    if(req.session.user)
    {
        if(req.session.user.userType == 1)
        {
            SQLConnection.execute('SELECT * FROM subjectsschedule, subjects WHERE `proffesor` = ? AND subjectsschedule.subjectID = subjects.ID ORDER BY isFriday, subjectIndex', [
                req.session.user.userIndex
            ], (err, result, fields) => {
                if(err) throw err

                let registeredItems = []

                result.forEach((item) => {

                    let shouldBeAdded = true;
                    registeredItems.forEach((registeredItem) => {
                        if(registeredItem.isFriday == item.isFriday && registeredItem.subjectIndex == item.subjectIndex)
                        {
                            shouldBeAdded = false;
                        }
                    })

                    if(shouldBeAdded)
                    {
                        registeredItems.push(item);
                    }
                })

                console.log(registeredItems)

                res.json(registeredItems);                 
            })
        }
    }
})

app.post('/getSubjectsForDate', async (req, res) => {
   
    if(req.session.user)
    {
        SQLConnection.execute('SELECT * FROM subjectsschedule, subjects WHERE `group` = ? AND `semester` = ? AND subjectsschedule.subjectID = subjects.ID ORDER BY isFriday, subjectIndex', [
            req.session.user.group,
            req.session.user.semester
        ], (err, result, fields) => {
            if(err) throw err

            res.json(result);                 
        })
    }
})

app.get('/getSubjects', async (req, res) => {
    
    if(req.session.user)
    {
        SQLConnection.execute(`SELECT * FROM subjects`, (err, result, fields) => {
            if(err) throw err

            res.json(result);                 
        })
    }
})

app.post('/addSemester', async (req, res) => {
    if(req.session.user)
    {
        if(req.session.user.userType == 2)
        {
            SQLConnection.execute('INSERT INTO semesters (startDate, endDate, name) VALUES (?, ?, ?)', [
                req.body.startDate,
                req.body.endDate,
                req.body.name
            ], (err, result, fields) => {
                if(err) throw err
                
                res.json(result.insertId)
            })
        }
    }
})

app.post('/addSubject', async (req, res) => {

    if(req.session.user)
    {
        if(req.session.user.userType == 2)
        {
            SQLConnection.execute('INSERT INTO subjects (name, proffesor, subjectLength, color, roomNumber) VALUES (?, ?, ?, ?, ?)', [
                req.body.name,
                req.body.proffesor,
                req.body.subjectLength,
                req.body.color,  
                req.body.roomNumber
            ], (err, result, fields) => {
                if(err) throw err

                res.json(result.insertId)
            })
        }
    }
})

app.get('/getSemesters', async (req, res) => {

    if(req.session.user)
    {
        SQLConnection.execute(`SELECT * FROM semesters`, (err, result, fields) => {
                if(err) throw err

                res.json(result);                 
            })
    }
})

app.post('/addSubjectsToSemester', (req, res) => {

    if(req.session.user)
    {
        if(req.session.user.userType == 2)
        {
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
                    
                    SQLConnection.query('INSERT INTO `subjectsschedule` (subjectID, isFriday, subjectIndex, semester, `group`) VALUES ?', [values], (err) => {
                        if (err) throw err;
                    })
                }
            })
        }
    }

    res.json()
})

app.post('/addGroups', async (req, res) => {

    if(req.session.user)
    {
        if(req.session.user.userType == 2)
        {
            SQLConnection.execute('INSERT INTO `groups` (`group`) VALUES (?)', [
                req.body.group
            ], (err, result, fields) => {
                if(err) throw err

            })
        }
    }

    res.json()
})

app.get('/getGroups', async (req, res) => {

    if(req.session.user)
    {
        SQLConnection.execute('SELECT * FROM `groups`', (err, result, fields) => {
                if(err) throw err

                res.json(result);                 
            })
    }
})

app.get('/isLogged', async (req, res) => {
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

app.post('/login', async (req, res, next) => {  

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

                    let redirectData = {
                        redirect: true,
                        userType: result[0].userType
                    }

                    res.json(redirectData);                 
                }
            }
        })
})

app.post('/loadSubjectsForDean', async (req, res) => {

    if(req.session.user)
    {
        if(req.session.user.userType == 2)
        {
            SQLConnection.execute('SELECT * FROM subjectsschedule, subjects WHERE `group` = ? AND `semester` = ? AND subjectsschedule.subjectID = subjects.ID ORDER BY isFriday, subjectIndex', [
                req.body.group,
                req.body.semester
            ], (err, result, fields) => {
                if(err) throw err

                res.json(result);                 
            })
        }
    }
})

app.post('/addTeacherNote', async (req, res) => {

    if(req.session.user)
    {
        if(req.session.user.userType == 1)
        {
            SQLConnection.execute('INSERT INTO `subjectchanges` (`index`, `date`, `note`) VALUES (?, ?, ?) AS new ON DUPLICATE KEY UPDATE `note`= new.note', [
                req.body.itemIndex,
                req.body.chosenDate,
                req.body.noteText
            ], (err, result, fields) => {
                if(err) throw err

            })
        }
    }

    res.json()
})

app.post('/loadNotes', async (req, res) => {
    let finalResult = {
        fridayNotes: [],
        saturdayNotes: []
    }

    SQLConnection.execute('SELECT * FROM `subjectchanges` WHERE `date` = ?', [
        req.body.friday
    ], (err, result, fields) => {
        if(err) throw err

        finalResult.fridayNotes = result

        SQLConnection.execute('SELECT * FROM `subjectchanges` WHERE `date` = ?', [
            req.body.saturday
        ], (err, result, fields) => {
            if(err) throw err
    
            finalResult.saturdayNotes = result

            res.json(finalResult)
        })
    })
})

app.post('/setWeekDate', async (req, res) => {
    if(req.session.user)
    {
        if(req.session.user.userType == 2)
        {
            SQLConnection.execute('INSERT IGNORE INTO `week` (`weekNumber`, `weekEndDate`) VALUES (?, ?)', [
                req.body.number,
                req.body.week
            ])
        }
    }

    res.json()
})


app.post('/loadWeekNumber', async (req, res) => {
    
    SQLConnection.execute('SELECT `weekNumber` FROM `week` WHERE `weekEndDate` < ? ORDER BY `weekNumber` LIMIT 1', [
        req.body.date
    ], (err, result, fields) => {
        if(err) throw err
    
        res.json(result[0])
    })
})




app.listen(port, '192.168.55.102', () => {
    console.log(`Works on port: ${port}`)
})