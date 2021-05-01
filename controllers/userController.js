const Users = require('../models/users')

exports.pullData = (req, res) => {
    Users.pull({
        'index': req.body.index,
        'password': req.body.password,
    }).then(result => {
        if(result != undefined)
        {
            console.log(result.attributes.index);

            let resultBody = {
                passed: true,
            }

            res.json(true)
        }
        else
        {
            res.json(false)
        }
    }).catch(result => {
        console.log(result)
    })
}