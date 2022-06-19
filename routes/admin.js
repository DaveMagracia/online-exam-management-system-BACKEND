const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth"); //include this middleware on routes that require authenticated access
const { loginAdmin, updateWebsite, getContent } = require("../controllers/adminTasks");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
   destination: (req, file, cb) => {
      cb(null, "../online-exam-management-system-FRONTEND/public/images/profilePictures/");
   },
   filename: (req, file, cb) => {
      //use userId as the filename so that it will be easily replaced/overwritten
      //when user changes profile pic again
      //    cb(null, userId + path.extname(file.originalname));
      cb(null, "logo" + path.extname(file.originalname));
   },
});

const upload = multer({ storage: storage });

router.route("/login").post(loginAdmin);
router.route("/update-content").put(authMiddleware, upload.single("image"), updateWebsite);
router.route("/content").get(getContent);

module.exports = router;
