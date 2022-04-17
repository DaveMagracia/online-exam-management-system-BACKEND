const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth"); //include this middleware on routes that require authenticated access
const {
   createExam,
   getExams,
   getExamDetails,
   updateExam,
   deleteExam,
   getSubjects,
   getSubjectNames,
   getExamsFromSubject,
} = require("../controllers/examTasks");

router
   .route("/")
   .get(authMiddleware, getExams)
   .post(authMiddleware, createExam);
router.route("/subjects").get(authMiddleware, getSubjects);
router.route("/subjectNames").get(authMiddleware, getSubjectNames);
router.route("/subjects/:subjectName").get(authMiddleware, getExamsFromSubject);
router
   .route("/:examId")
   .get(authMiddleware, getExamDetails)
   .delete(authMiddleware, deleteExam)
   .patch(authMiddleware, updateExam);

module.exports = router;
