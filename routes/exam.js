const express = require("express");
const router = express.Router();
const {
   createExam,
   getExams,
   getExamDetails,
   updateExam,
   deleteExam,
} = require("../controllers/examTasks");

router.route("/").get(getExams).post(createExam);
router
   .route("/:examId")
   .get(getExamDetails)
   .delete(deleteExam)
   .patch(updateExam);

module.exports = router;
