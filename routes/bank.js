const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth"); //include this middleware on routes that require authenticated access
const {
   createQuestionBank,
   getQuestionBanks,
   deleteQuestionBank,
   getQuestionBankDetails,
   updateQuestionBank,
} = require("../controllers/questionBankTasks");

router
   .route("/")
   .post(authMiddleware, createQuestionBank)
   .get(authMiddleware, getQuestionBanks);
router
   .route("/:bankId")
   .get(authMiddleware, getQuestionBankDetails)
   .delete(authMiddleware, deleteQuestionBank)
   .patch(authMiddleware, updateQuestionBank);

module.exports = router;
