const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth"); //include this middleware on routes that require authenticated access
const {
   registerUser,
   loginUser,
   loginAdmin,
   getUserInfo,
   registerCode,
   updateProfile,
   changePassword,
   addToDo,
   getToDo,
} = require("../controllers/userTasks");
const multer = require("multer");
const path = require("path");

//For uploading profile picture
const storage = multer.diskStorage({
   destination: (req, file, cb) => {
      cb(null, "../online-exam-management-system-FRONTEND/public/images/profilePictures/");
   },
   filename: (req, file, cb) => {
      const userId = req.params.userId;
      //use userId as the filename so that it will be easily replaced/overwritten
      //when user changes profile pic again
      cb(null, userId + path.extname(file.originalname));
   },
});

const upload = multer({ storage: storage });

router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/info").get(authMiddleware, getUserInfo);
router.route("/").patch(authMiddleware, changePassword);
router.route("/:userId").put(authMiddleware, upload.single("photo"), updateProfile);
router.route("/exam-code").post(authMiddleware, registerCode);
router.route("/addtodolist").post(authMiddleware, addToDo);
router.route("/getTodo").get(authMiddleware, getToDo);

module.exports = router;
