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
   startExam,
   generateTOS,
   submitExam,
   getDates,
   getStudentResults,
   getStudentActionLog,
   getAllResults,
   retakeExam,
} = require("../controllers/examTasks");

router
   .route("/")
   .get(authMiddleware, getExams)
   .post(authMiddleware, createExam)
   .patch(authMiddleware, submitExam);
router.route("/dates").get(authMiddleware, getDates);
router.route("/subjects").get(authMiddleware, getSubjects);
router.route("/start/:examId").post(authMiddleware, startExam);
router.route("/generateTOS/:examId").post(authMiddleware, generateTOS);
router.route("/retake-exam/:userId/:examCode").patch(authMiddleware, retakeExam);
router.route("/subjectNames").get(authMiddleware, getSubjectNames);
router.route("/subjects/:subjectName").get(authMiddleware, getExamsFromSubject);
router
   .route("/:examId")
   .get(authMiddleware, getExamDetails)
   .delete(authMiddleware, deleteExam)
   .patch(authMiddleware, updateExam);
router.route("/results/:examCode/:userId").get(authMiddleware, getStudentResults);
router.route("/results/:examCode").get(authMiddleware, getAllResults);
router.route("/logs/:examCode/:userId").get(authMiddleware, getStudentActionLog);

module.exports = router;
