const { application } = require('express');
const bookshelf = require('../config/bookshelf');

const Users = bookshelf.Model.extend({
    tableName: 'users'
})

module.exports.pull = (data) => {
    return new Users({          
        index: data.index,
        password: data.password
        }).fetch().catch(Users.NotFoundError, error => {
           
        })
}