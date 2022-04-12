const mongoose = require("mongoose");
const Question = require("./Question.model").schema;

const QuestionBank = new mongoose.Schema(
   {
      createdBy: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "User",
         required: true,
         immutable: true, //once the value is set, it cannot be changed
      },
      title: {
         type: String,
         required: false,
      },
      questions: [Question],
      totalQuestions: {
         type: Number,
         required: false,
      },
      isFromExam: {
         type: Boolean,
         required: true,
         default: false,
      },
      questionBanks: {
         //will contain array of objects
         // object contains number of questions and the reference to the other question bank
         required: false,
         type: [
            {
               noOfQuestions: {
                  type: Number,
                  required: true,
               },
               //reference to another question bank
               questionBank: {
                  type: mongoose.Schema.Types.ObjectId,
                  ref: "QuestionBank",
               },
            },
         ],
      },
   },
   {
      timestamps: true,
   }
);

module.exports = mongoose.model("QuestionBank", QuestionBank);
