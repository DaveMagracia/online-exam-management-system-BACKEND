const express = require("express");
const router = express.Router();
const {
   createQuestionBank,
   getQuestionBanks,
   deleteQuestionBank,
   getQuestionBankDetails,
   updateQuestionBank,
} = require("../controllers/questionBankTasks");

router.route("/").post(createQuestionBank).get(getQuestionBanks);
router
   .route("/:bankId")
   .get(getQuestionBankDetails)
   .delete(deleteQuestionBank)
   .patch(updateQuestionBank);

module.exports = router;
