const express = require("express");
const asyncWrapper = require("../middleware/async");
const User = require("../models/User.model");
const Exam = require("../models/Exam.model");
const QuestionBank = require("../models/QuestionBank.model");
const Question = require("../models/Question.model");
const { create } = require("../models/Question.model");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { default: ShortUniqueId } = require("short-unique-id"); //library for generating unique code
const schedule = require("node-schedule");

const createExam = asyncWrapper(async (req, res, next) => {
   //Verify first if user is legitimate
   //the token is the user who sent the request
   const userTokenDecoded = jwt.verify(
      req.header("Authorization"),
      process.env.JWT_SECRET_KEY
   );
   const user = await User.findById(
      mongoose.Types.ObjectId(userTokenDecoded.id)
   );
   if (!user) {
      let error = new Error("User not found.");
      error.status = 404;
      return next(error);
   }

   //////////////////////////////////////////

   var totalPoints = 0;
   totalPoints = req.body.questions.reduce(
      (acc, curr) => acc + Number(curr.points),
      0
   );

   //create question bank and save into DB
   const createdBank = await QuestionBank.create({
      createdBy: mongoose.Types.ObjectId(userTokenDecoded.id),
      questions: req.body.questions,
      isFromExam: true,
   });

   if (!createdBank) {
      let error = new Error("Failed to create question bank.");
      error.status = 500;
      return next(error);
   }

   if (req.body.isPublishing) {
      const uid = new ShortUniqueId({ length: 10 });
      var generatedExamCode = "";

      while (true) {
         //infinite loop to generate UIDs
         //this loop will break if the generated id doesnt exist in the database
         //this is to ensure their uniqueness
         generatedExamCode = uid();

         const exam = await Exam.findOne({ examCode: generatedExamCode });
         //if an exam exists with the generate examCode, generate another
         if (exam) continue;
         else break;
      }

      //create exam and save into DB
      //NOTE: the exam is created and published at the same time
      const createdExam = await Exam.create({
         createdBy: mongoose.Types.ObjectId(userTokenDecoded.id),
         title: req.body.exam.title,
         date_from: req.body.exam.date_from,
         date_to: req.body.exam.date_to,
         time_limit: req.body.exam.time_limit,
         directions: req.body.exam.directions,
         totalItems: req.body.questions.length,
         questionBankId: createdBank._id,
         totalPoints: totalPoints,
         examCode: generatedExamCode,
         status: "posted",
      });

      if (!createdExam) {
         //also delete exam question bank if creating exam fails
         //if exam creation fails then its corresponding questionBank will be unnecessary in the database
         await QuestionBank.deleteOne({ _id: createdBank._id });
         let error = new Error("Failed to create exam.");
         error.status = 500;
         return next(error);
      }

      //Schedule when the exam will be opened and closed
      schedule.scheduleJob(req.body.exam.date_from, async () => {
         //update the existing exam to a "opened" state
         const openedExam = await Exam.findByIdAndUpdate(createdExam._id, {
            status: "opened",
         });
         if (!openedExam) {
            let error = new Error("Failed to open exam");
            error.status = 400;
            return next(error);
         }
      });

      schedule.scheduleJob(req.body.exam.date_to, async () => {
         //update the existing exam to a "closed" state
         const closedExam = await Exam.findByIdAndUpdate(createdExam._id, {
            status: "closed",
         });
         if (!closedExam) {
            let error = new Error("Failed to close exam");
            error.status = 400;
            return next(error);
         }
      });

      //return the exam code
      return res
         .status(200)
         .json({ status: "ok", examCode: generatedExamCode });
   } else {
      //create exam and save into DB
      //NOTE: the exam saved is unpublished.
      //No exam code is provided because the exam is not yet published
      const createdExam = await Exam.create({
         createdBy: mongoose.Types.ObjectId(user.id),
         title: req.body.exam.title,
         date_from: req.body.exam.date_from,
         date_to: req.body.exam.date_to,
         time_limit: req.body.exam.time_limit,
         directions: req.body.exam.directions,
         totalItems: req.body.questions.length,
         totalPoints: totalPoints,
         questionBankId: createdBank._id,
         status: "unposted", //unposted by default
         examCode: "",
      });

      if (!createdExam) {
         //also delete exam question bank if creating exam fails
         //if exam creation fails then its corresponding questionBank will be unnecessary in the database
         await QuestionBank.deleteOne({ _id: createdBank._id });
         let error = new Error("Failed to create exam.");
         error.status = 500;
         return next(error);
      }

      return res.status(200).json({ status: "ok" });
   }
});

const updateExam = asyncWrapper(async (req, res, next) => {
   //Verify first if user is legitimate or if the exam is created by the requester
   //the token is the user who sent the request
   const userTokenDecoded = jwt.verify(
      req.header("Authorization"),
      process.env.JWT_SECRET_KEY
   );

   const user = await User.findById(
      mongoose.Types.ObjectId(userTokenDecoded.id)
   );
   if (!user) {
      let error = new Error("User not found.");
      error.status = 404;
      return next(error);
   }

   const exam = await Exam.findById(mongoose.Types.ObjectId(req.params.examId));
   if (!exam) {
      let error = new Error("Exam not found");
      error.status = 404;
      return next(error);
   }

   if (String(user._id) !== String(exam.createdBy)) {
      let error = new Error(
         "You are unauthorized to access this resource, OR the source you are looking is not found"
      );
      error.status = 403;
      return next(error);
   }

   ////////////////////////////////

   var totalPoints = 0;
   totalPoints = req.body.questions.reduce(
      (acc, curr) => acc + Number(curr.points),
      0
   );

   //if isPublishing, then updated the exam to a posted state
   if (req.body.isPublishing) {
      const uid = new ShortUniqueId({ length: 10 });
      var generatedExamCode = "";

      while (true) {
         //infinite loop to generate UIDs
         //this loop will break if the generated id doesnt exist in the database
         //this is to ensure their uniqueness
         generatedExamCode = uid();

         const exam = await Exam.findOne({ examCode: generatedExamCode });
         //if an exam exists with the generate examCode, generate another
         if (exam) continue;
         else break;
      }

      //update the existing exam to a "posted" state
      const updatedExam = await Exam.findByIdAndUpdate(
         mongoose.Types.ObjectId(req.params.examId),
         {
            title: req.body.examData.title,
            date_from: req.body.examData.date_from,
            date_to: req.body.examData.date_to,
            time_limit: req.body.examData.time_limit,
            directions: req.body.examData.directions,
            totalItems: req.body.questions.length,
            totalPoints: totalPoints,
            examCode: generatedExamCode,
            status: "posted",
         }
      );

      if (!updatedExam) {
         let error = new Error("Failed to update exam.");
         error.status = 500;
         return next(error);
      }

      const updatedQuestionBank = await QuestionBank.findByIdAndUpdate(
         mongoose.Types.ObjectId(updatedExam.questionBankId),
         { questions: req.body.questions }
      );

      if (!updatedQuestionBank) {
         let error = new Error("Failed to update question bank.");
         error.status = 500;
         return next(error);
      }

      res.status(200).json({ msg: "success", examCode: generatedExamCode });
   } else {
      //UPDATE THE EXAM
      const updatedExam = await Exam.findByIdAndUpdate(
         mongoose.Types.ObjectId(req.params.examId),
         {
            title: req.body.examData.title,
            date_from: req.body.examData.date_from,
            date_to: req.body.examData.date_to,
            time_limit: req.body.examData.time_limit,
            directions: req.body.examData.directions,
            totalItems: req.body.questions.length,
            totalPoints: totalPoints,
            status: "unposted",
         }
      );

      if (!updatedExam) {
         let error = new Error("Exam update failed");
         error.status = 500;
         return next(error);
      }

      //update the question bank
      const updatedQuestionBank = await QuestionBank.findByIdAndUpdate(
         mongoose.Types.ObjectId(updatedExam.questionBankId),
         { questions: req.body.questions }
      );

      if (!updatedQuestionBank) {
         let error = new Error("Question bank update failed");
         error.status = 500;
         return next(error);
      }

      return res.status(200).json({ msg: "success" });
   }
});

//GET ALL EXAMS FROM A SPECIFIC USER
const getExams = asyncWrapper(async (req, res, next) => {
   const userTokenDecoded = jwt.verify(
      req.header("Authorization"),
      process.env.JWT_SECRET_KEY
   );

   const user = await User.findById(
      mongoose.Types.ObjectId(userTokenDecoded.id)
   );

   if (!user) {
      let error = new Error("User not found.");
      error.status = 404;
      return next(error);
   }

   const exams = await Exam.find({
      createdBy: mongoose.Types.ObjectId(userTokenDecoded.id),
   })
      .select(
         "_id title date_from date_to totalItems totalPoints status createdAt examCode"
      ) //specify fields that are included
      .sort("-createdAt"); //sort by date created in descending order

   if (!exams) {
      let error = new Error("Something went wrong. Can't find created exams.");
      error.status = 404;
      return next(error);
   }

   return res.status(200).json({ exams });
});

const getExamDetails = asyncWrapper(async (req, res, next) => {
   const userTokenDecoded = jwt.verify(
      req.header("Authorization"),
      process.env.JWT_SECRET_KEY
   );

   const user = await User.findById(
      mongoose.Types.ObjectId(userTokenDecoded.id)
   );

   if (!user) {
      let error = new Error("User not found.");
      error.status = 404;
      return next(error);
   }

   const exam = await Exam.findById(mongoose.Types.ObjectId(req.params.examId));
   if (!exam) {
      let error = new Error("Exam not found");
      error.status = 404;
      return next(error);
   }
   /*For security, check if the exam is created by the requester
     if the exam is not created by the requester, then respond with error 403 (forbidden)

     cast the IDs to string first because the IDs are objects
     omparing two objects with === will return false because they are 2 different objects with the same value*/
   if (String(user._id) !== String(exam.createdBy)) {
      let error = new Error(
         "You are unauthorized to access this resource, OR the source you are looking is not found"
      );
      error.status = 403;
      return next(error);
   }

   const questionBank = await QuestionBank.findById(exam.questionBankId);
   if (!questionBank) {
      let error = new Error("Question bank not found");
      error.status = 404;
      return next(error);
   }

   res.status(200).json({
      exam: exam,
      questionBank: questionBank,
   });
});

const deleteExam = asyncWrapper(async (req, res, next) => {
   const userTokenDecoded = jwt.verify(
      req.header("Authorization"),
      process.env.JWT_SECRET_KEY
   );
   const user = await User.findById(
      mongoose.Types.ObjectId(userTokenDecoded.id)
   );

   if (!user) {
      let error = new Error("User not found.");
      error.status = 404;
      return next(error);
   }

   const exam = await Exam.findById(mongoose.Types.ObjectId(req.params.examId));
   if (!exam) {
      let error = new Error("Exam not found");
      error.status = 404;
      return next(error);
   }

   //check if the exam is created by the requester
   if (String(user._id) !== String(exam.createdBy)) {
      let error = new Error(
         "You are unauthorized to access this resource, OR the source you are looking is not found."
      );
      error.status = 403;
      return next(error);
   }

   //delete the exam
   const deletedExam = await Exam.findByIdAndDelete(
      mongoose.Types.ObjectId(req.params.examId)
   );

   if (!deletedExam) {
      let error = new Error("Failed to delete exam");
      error.status = 500;
      return next(error);
   }

   //delete the exam's corresponding question bank
   const deletedQuestionBank = await QuestionBank.findByIdAndDelete(
      mongoose.Types.ObjectId(deletedExam.questionBankId)
   );

   if (!deletedExam) {
      let error = new Error("Failed to delete question bank");
      error.status = 404;
      return next(error);
   }

   res.status(200).json({ msg: "delete success" });
});

module.exports = {
   createExam,
   getExams,
   getExamDetails,
   updateExam,
   deleteExam,
};
