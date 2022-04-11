const express = require("express");
const router = express.Router();
const {
   createExam,
   postExam,
   saveExam,
   getExams,
   getExamDetails,
   updateExam,
   deleteExam,
} = require("../controllers/examTasks");

router.route("/").post(getExamDetails);
router.route("/:examId").delete(deleteExam).put(postExam);
router.route("/getAll").post(getExams);
router.route("/create").post(createExam);
router.route("/save").post(saveExam);
router.route("/update/:examId").put(updateExam);

module.exports = router;
