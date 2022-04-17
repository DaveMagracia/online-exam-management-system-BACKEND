const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth"); //include this middleware on routes that require authenticated access
const {
   registerUser,
   loginUser,
   getUserInfo,
   registerCode,
   updateProfile,
   changePassword,
} = require("../controllers/userTasks");

router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/info").get(authMiddleware, getUserInfo);
router.route("/").patch(authMiddleware, changePassword);
router.route("/:userId").put(authMiddleware, updateProfile);
router.route("/exam-code").post(authMiddleware, registerCode);

module.exports = router;
