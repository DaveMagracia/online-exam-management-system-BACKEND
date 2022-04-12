const express = require("express");
const User = require("../models/User.model");
const QuestionBank = require("../models/QuestionBank.model");
const asyncWrapper = require("../middleware/async");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const createQuestionBank = asyncWrapper(async (req, res, next) => {
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

   const createdBank = await QuestionBank.create({
      title: req.body.formData.title,
      createdBy: mongoose.Types.ObjectId(user._id),
      questions: req.body.questions,
      totalQuestions: req.body.questions.length,
      isFromExam: false,
   });

   if (!createdBank) {
      let error = new Error(
         "Failed to create question bank. Please try again."
      );
      error.status = 500;
      return next(error);
   }

   return res.status(200).json({ msg: "success" });
});

const getQuestionBanks = asyncWrapper(async (req, res, next) => {
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

   const questionBanks = await QuestionBank.find({
      createdBy: mongoose.Types.ObjectId(userTokenDecoded.id),
      isFromExam: false, //if isFromExam === false, then it doesnt belong to an exam
   })
      .select("_id title totalQuestions") //specify fields that are included
      .sort("-createdAt"); //sort by date created in descending order

   //questionBanks
   return res
      .status(200)
      .json({ msg: "success", questionBanks: questionBanks });
});

const deleteQuestionBank = asyncWrapper(async (req, res, next) => {
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

   const bank = await QuestionBank.findById(
      mongoose.Types.ObjectId(req.params.bankId)
   );
   if (!bank) {
      let error = new Error("Question bank not found");
      error.status = 404;
      return next(error);
   }

   //check if the bank is created by the requester
   if (String(user._id) !== String(bank.createdBy)) {
      let error = new Error(
         "You are unauthorized to access this resource, OR the source you are looking is not found."
      );
      error.status = 403;
      return next(error);
   }

   //delete the exam
   const deletedBank = await QuestionBank.findByIdAndDelete(
      mongoose.Types.ObjectId(req.params.bankId)
   );

   if (!deletedBank) {
      let error = new Error("Failed to delete question bank.");
      error.status = 500;
      return next(error);
   }

   res.status(200).json({ msg: "delete success" });
});

const getQuestionBankDetails = asyncWrapper(async (req, res, next) => {
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

   const questionBank = await QuestionBank.findById(
      mongoose.Types.ObjectId(req.params.bankId)
   );
   if (!questionBank) {
      let error = new Error("Question bank not found.");
      error.status = 404;
      return next(error);
   }

   res.json({ msg: "success", questionBank: questionBank });
});

const updateQuestionBank = asyncWrapper(async (req, res, next) => {
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

   const questionBank = await QuestionBank.findById(
      mongoose.Types.ObjectId(req.params.bankId)
   );
   if (!questionBank) {
      let error = new Error("Question bank not found");
      error.status = 404;
      return next(error);
   }

   if (String(user._id) !== String(questionBank.createdBy)) {
      let error = new Error(
         "You are unauthorized to access this resource, OR the source you are looking is not found"
      );
      error.status = 403;
      return next(error);
   }

   const updatedQuestionBank = await QuestionBank.findByIdAndUpdate(
      mongoose.Types.ObjectId(req.params.bankId),
      {
         title: req.body.formData.title,
         questions: req.body.questions,
      }
   );

   if (!updatedQuestionBank) {
      let error = new Error("Failed to update question bank.");
      error.status = 500;
      return next(error);
   }

   res.status(200).json({ msg: "success" });
});

module.exports = {
   createQuestionBank,
   getQuestionBanks,
   deleteQuestionBank,
   getQuestionBankDetails,
   updateQuestionBank,
};
