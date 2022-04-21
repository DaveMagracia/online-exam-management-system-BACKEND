const mongoose = require("mongoose");

//each instance of this model will contain the data (ex. answers, choices, questions, etc.)
//of a registered exam for each user
const ExamRegisters = new mongoose.Schema(
   {
      user: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "User",
      },
      status: {
         type: String,
      },
      examCode: {
         type: String,
         required: true,
         unique: true,
      },
      details: {
         type: mongoose.Schema.Types.Mixed,
      },
   },
   { collection: "examRegisters", timestamps: true }
);

module.exports = mongoose.model("ExamRegisters", ExamRegisters);
