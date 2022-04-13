const express = require("express");
const asyncWrapper = require("../middleware/async");
//models
const User = require("../models/User.model");
const Exam = require("../models/Exam.model");
const QuestionBank = require("../models/QuestionBank.model");
//libraries
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { default: ShortUniqueId } = require("short-unique-id"); //library for generating unique code
const schedule = require("node-schedule");
//errors
const {
   InternalServerError,
   NotFoundError,
   UnauthenticatedError,
} = require("../errors");

const createExam = asyncWrapper(async (req, res, next) => {
   var user = req.user;

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

   if (!createdBank)
      throw new InternalServerError("Failed to create question bank.");

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
         createdBy: mongoose.Types.ObjectId(user.id),
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
         throw new InternalServerError("Failed to create exam.");
      }

      //Schedule when the exam will be opened and closed
      schedule.scheduleJob(req.body.exam.date_from, async () => {
         //update the existing exam to a "opened" state
         const openedExam = await Exam.findByIdAndUpdate(createdExam._id, {
            status: "opened",
         });
         if (!openedExam) {
            throw new InternalServerError(
               "Failed to set exam to an open state."
            );
         }
      });

      schedule.scheduleJob(req.body.exam.date_to, async () => {
         //update the existing exam to a "closed" state
         const closedExam = await Exam.findByIdAndUpdate(createdExam._id, {
            status: "closed",
         });
         if (!closedExam)
            throw new InternalServerError(
               "Failed to set exam to an closed state."
            );
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
         throw new InternalServerError("Failed to create exam.");
      }

      return res.status(200).json({ status: "ok" });
   }
});

const updateExam = asyncWrapper(async (req, res, next) => {
   var user = req.user;

   const exam = await Exam.findById(mongoose.Types.ObjectId(req.params.examId));
   if (!exam) throw new NotFoundError("Exam not found.");

   if (String(user.id) !== String(exam.createdBy))
      throw new UnauthenticatedError(
         "You are unauthorized to access this resource."
      );

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

      if (!updatedExam) throw new InternalServerError("Failed to update exam.");

      const updatedQuestionBank = await QuestionBank.findByIdAndUpdate(
         mongoose.Types.ObjectId(updatedExam.questionBankId),
         { questions: req.body.questions }
      );

      if (!updatedQuestionBank)
         throw new InternalServerError("Failed to update question bank.");

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

      if (!updatedExam) throw new InternalServerError("Failed to update exam.");

      //update the question bank
      const updatedQuestionBank = await QuestionBank.findByIdAndUpdate(
         mongoose.Types.ObjectId(updatedExam.questionBankId),
         { questions: req.body.questions }
      );

      if (!updatedQuestionBank)
         throw new InternalServerError("Failed to update question bank.");

      return res.status(200).json({ msg: "success" });
   }
});

//GET ALL EXAMS FROM A SPECIFIC USER
const getExams = asyncWrapper(async (req, res, next) => {
   var user = req.user;

   const exams = await Exam.find({
      createdBy: mongoose.Types.ObjectId(user.id),
   })
      .select(
         "_id title date_from date_to totalItems totalPoints status createdAt examCode"
      ) //specify fields that are included
      .sort("-createdAt"); //sort by date created in descending order

   if (!exams)
      throw new NotFoundError(
         "Something went wrong. Can't find created exams."
      );

   return res.status(200).json({ exams });
});

const getExamDetails = asyncWrapper(async (req, res, next) => {
   var user = req.user;

   const exam = await Exam.findById(mongoose.Types.ObjectId(req.params.examId));
   if (!exam) throw new NotFoundError("Exam not found.");

   /*For security, check if the exam is created by the requester
     if the exam is not created by the requester, then respond with error 403 (forbidden)

     cast the IDs to string first because the IDs are objects
     omparing two objects with === will return false because they are 2 different objects with the same value*/
   if (String(user.id) !== String(exam.createdBy))
      throw new UnauthenticatedError(
         "You are unauthorized to access this resource."
      );

   const questionBank = await QuestionBank.findById(exam.questionBankId);
   if (!questionBank) throw new NotFoundError("Question bank not found.");

   res.status(200).json({
      exam: exam,
      questionBank: questionBank,
   });
});

const deleteExam = asyncWrapper(async (req, res, next) => {
   var user = req.user;

   const exam = await Exam.findById(mongoose.Types.ObjectId(req.params.examId));
   if (!exam) throw new NotFoundError("Exam not found.");

   //check if the exam is created by the requester
   if (String(user.id) !== String(exam.createdBy))
      throw new UnauthenticatedError(
         "You are unauthorized to access this resource."
      );

   //delete the exam
   const deletedExam = await Exam.findByIdAndDelete(
      mongoose.Types.ObjectId(req.params.examId)
   );

   if (!deletedExam) throw new InternalServerError("Failed to delete exam.");

   //delete the exam's corresponding question bank
   const deletedQuestionBank = await QuestionBank.findByIdAndDelete(
      mongoose.Types.ObjectId(deletedExam.questionBankId)
   );

   if (!deletedQuestionBank)
      throw new InternalServerError("Failed to delete exam question bank.");

   res.status(200).json({ msg: "delete success" });
});

module.exports = {
   createExam,
   getExams,
   getExamDetails,
   updateExam,
   deleteExam,
};
