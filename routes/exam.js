const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth"); //include this middleware on routes that require authenticated access
const {
   createExam,
   getExams,
   getExamDetails,
   updateExam,
   deleteExam,
} = require("../controllers/examTasks");

router
   .route("/")
   .get(authMiddleware, getExams)
   .post(authMiddleware, createExam);
router
   .route("/:examId")
   .get(authMiddleware, getExamDetails)
   .delete(authMiddleware, deleteExam)
   .patch(authMiddleware, updateExam);

module.exports = router;
