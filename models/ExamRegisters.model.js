const mongoose = require("mongoose");

//each instance of this model will contain the data (ex. answers, choices, questions, etc.)
//of a registered exam for each user
const ExamRegisters = new mongoose.Schema(
   {
      user: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "User",
      },
      examCode: {
         type: String,
         required: true,
         unique: true,
      },
   },
   { collection: "examRegisters", timestamps: true }
);

module.exports = mongoose.model("ExamRegisters", ExamRegisters);
