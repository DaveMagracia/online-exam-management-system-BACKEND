const express = require('express')
const router = express.Router()
const {
    registerUser,
    loginUser,
    getUserInfo,
} = require('../controllers/userTasks')

router.route('/register').post(registerUser)
router.route('/login').post(loginUser)
router.route('/info').get(getUserInfo)

module.exports = router