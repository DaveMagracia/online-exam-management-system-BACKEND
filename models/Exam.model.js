const mongoose = require("mongoose");
const QuestionBank = require("./QuestionBank.model");

const Exam = new mongoose.Schema(
   {
      createdBy: {
         type: mongoose.Schema.Types.ObjectId, //id of the user who created the exam
         ref: "User",
         required: true,
      },
      title: {
         type: String,
         required: true,
      },
      date_from: {
         type: Date,
      },
      date_to: {
         type: Date,
      },
      time_limit: {
         type: Number,
      },
      directions: {
         type: String,
      },
      totalItems: {
         type: Number,
      },
      totalPoints: {
         type: Number,
      },
      status: {
         type: String,
         required: true,
      },
      examCode: {
         type: String,
      },
      questionBankId: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "QuestionBank",
         required: true,
      },
   },
   { timestamps: true }
);

module.exports = mongoose.model("Exam", Exam);
