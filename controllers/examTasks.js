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

const createExam = asyncWrapper(async (req, res, next) => {
   //Verify first if user is legitimate
   //the token is the user who sent the request
   const userTokenDecoded = jwt.verify(
      req.header("token"),
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
      let error = new Error(
         "Failed to create question bank. Please try again."
      );
      error.status = 400;
      return next(error);
   }

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

   //create instance of the exam in the db
   //create exam and save into DB
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
      let error = new Error("Failed to create exam");
      error.status = 400;
      return next(error);
   }

   //return the exam code
   return res.status(200).json({ status: "ok", examCode: generatedExamCode });
});

const postExam = asyncWrapper(async (req, res, next) => {
   //this function sets an existing exam to a posted/published state, NOT create

   //Verify first if user is legitimate
   //the token is the user who sent the request
   const userTokenDecoded = jwt.verify(
      req.header("token"),
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

   var totalPoints = 0;
   totalPoints = req.body.questions.reduce(
      (acc, curr) => acc + Number(curr.points),
      0
   );

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
         title: req.body.exam.title,
         date_from: req.body.exam.date_from,
         date_to: req.body.exam.date_to,
         time_limit: req.body.exam.time_limit,
         directions: req.body.exam.directions,
         totalItems: req.body.questions.length,
         totalPoints: totalPoints,
         examCode: generatedExamCode,
         status: "posted",
      }
   );

   if (!updatedExam) {
      let error = new Error("Failed to update exam.");
      error.status = 400;
      return next(error);
   }

   const updatedBank = await QuestionBank.findByIdAndUpdate(
      mongoose.Types.ObjectId(updatedExam.questionBankId),
      { questions: req.body.questions }
   );

   if (!updatedBank) {
      let error = new Error("Failed to update question bank.");
      error.status = 400;
      return next(error);
   }

   res.status(200).json({ msg: "success", examCode: generatedExamCode });
});

const saveExam = asyncWrapper(async (req, res, next) => {
   //user who sent the request
   const user = jwt.decode(req.body.user);
   var totalPoints = 0;

   totalPoints = req.body.questions.reduce(
      (acc, curr) => acc + Number(curr.points),
      0
   );

   //create question bank and save into DB
   const createdBank = await QuestionBank.create({
      createdBy: mongoose.Types.ObjectId(user.id),
      questions: req.body.questions,
      isFromExam: true,
   });

   if (!createdBank) {
      let error = new Error(
         "Failed to create question bank. Please try again."
      );
      error.status = 400;
      return next(error);
   }

   //create exam and save into DB
   //NOTE: this exam is incomplete
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
      let error = new Error("Failed to create exam. Please try again.");
      error.status = 400;
      return next(error);
   }

   return res.status(200).json({ status: "ok" });
});

//GET ALL EXAMS FROM A SPECIFIC USER
const getExams = asyncWrapper(async (req, res, next) => {
   const userTokenDecoded = jwt.decode(req.body.user);
   const exams = await Exam.find({
      createdBy: mongoose.Types.ObjectId(userTokenDecoded.id),
   })
      .select(
         "title date_from date_to totalItems totalPoints status createdAt examCode"
      ) //specify fields that are included
      .sort("-createdAt"); //sort by date created in descending order

   if (!exams) {
      let error = new Error("Something went wrong. Can't find created exams.");
      error.status = 400;
      return next(error);
   }

   return res.status(200).json({ exams });
});

const getExamDetails = asyncWrapper(async (req, res, next) => {
   const userTokenDecoded = jwt.decode(req.body.user);
   const userId = userTokenDecoded.id;
   const user = await User.findById(mongoose.Types.ObjectId(userId));
   if (!user) {
      let error = new Error("User not found");
      error.status = 404;
      return next(error);
   }

   const exam = await Exam.findById(mongoose.Types.ObjectId(req.body.examId));
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

const updateExam = asyncWrapper(async (req, res, next) => {
   const userTokenDecoded = jwt.verify(
      req.header("token"),
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

   var totalPoints = 0;

   //count total points
   totalPoints = req.body.questions.reduce(
      (acc, curr) => acc + Number(curr.points),
      0
   );

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
         status: "unposted",
         totalPoints: totalPoints,
      }
   );

   if (!updatedExam) {
      let error = new Error("Exam update failed");
      error.status = 400;
      return next(error);
   }

   //update the question bank
   const updatedQuestionBank = await QuestionBank.findByIdAndUpdate(
      mongoose.Types.ObjectId(updatedExam.questionBankId),
      {
         questions: req.body.questions,
         //TODO: update question bank ref
      }
   );

   if (!updatedQuestionBank) {
      let error = new Error("Question bank update failed");
      error.status = 400;
      return next(error);
   }

   res.status(200).json({ msg: "success" });
});

//GOODS
const deleteExam = asyncWrapper(async (req, res, next) => {
   const userTokenDecoded = jwt.decode(req.headers.authorization);
   const userId = userTokenDecoded.id;
   const user = await User.findById(mongoose.Types.ObjectId(userId));
   if (!user) {
      let error = new Error("User not found");
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
      error.status = 404;
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
   postExam,
   saveExam,
   getExams,
   getExamDetails,
   updateExam,
   deleteExam,
};
