const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth"); //include this middleware on routes that require authenticated access
const {
   registerUser,
   loginUser,
   getUserInfo,
} = require("../controllers/userTasks");

router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/info").get(authMiddleware, getUserInfo);

module.exports = router;
