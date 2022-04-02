//THIS FILE CONTAINS ALL THE HANDLERS/FUNCTIONS FOR "/user" ROUTES 
const express = require('express')
const User = require('../models/User.model')
const asyncWrapper = require('../middleware/async')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt') 


const registerUser = async (req, res, next) => { 
    //get the request body then extract its contents to create a User in the database 
    try {
        await User.create({
            username: req.body.username,
            email: req.body.email,
            password: req.body.pass,
            userType: req.body.userType,
        })
    } catch (err) {
        //MongoServerError: E11000 duplicate key error collection
        //Code 409: 409 Conflict - This response is sent when a request conflicts with the current state of the server.
        if (err.code === 11000) {
            const error = new Error('Username/Email already exists')
            error.status = 409
            return next(error)
        }

        //Code 500: 500 Internal Server Error - The server has encountered a situation it does not know how to handle.
        const error2 = new Error('Something went wrong. Please try again.')
        error2.status = 500
        return next(error2)
    }
    
    res.status(200).json({ status: "ok"})
}

// the "asyncWrapper" will make the code shorter. 
// It will prevent the repetitive use of the try/catch block which makes code longer
const loginUser = asyncWrapper(async (req, res, next) => {
    //check if input is email or username
    let emailRegex = /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
    let email_username = req.body.email_username
    let isEmail = emailRegex.test(email_username)

    const user = await User.findOne({ 
        //if input is an email find for 'email' property, else find for username
        [isEmail ? 'email' : 'username']: email_username, 
    })

    if(!user){
        const error = new Error('Invalid credentials.')
        error.status = 404
        return next(error)
    }

    //bcrpyt will compare the actual password input, with the encrypted password in the database
    const isMatch = await bcrypt.compare(req.body.pass, user.password)
    //if user is not found
    if(!isMatch){
        const error = new Error('Invalid credentials.')
        error.status = 404
        return next(error)
    }
    
    //if user exists, then create a token
    const token = jwt.sign({
        email: user.email,
        username: user.username,
    }, 'secret123')
    return res.json({status: 'ok', user: token})
    
})

//export the functions to be used in routes/user.js
module.exports = {
    registerUser, 
    loginUser,
}