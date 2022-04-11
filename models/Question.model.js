const mongoose = require("mongoose");

const Question = new mongoose.Schema({
   question: {
      type: String,
      required: true,
   },
   choice1: {
      type: String,
      required: true,
   },
   choice2: {
      type: String,
      required: true,
   },
   choice3: {
      type: String,
      required: true,
   },
   choice4: {
      type: String,
      required: true,
   },
   answer: {
      //contains the index of the correct answer from the choices
      type: Number,
      required: true,
   },
   cpd: {
      type: String,
      required: true,
   },
   kd: {
      type: String,
      required: true,
   },
   points: {
      type: Number,
      required: true,
      default: 1,
   },
});

module.exports = mongoose.model("Question", Question);
