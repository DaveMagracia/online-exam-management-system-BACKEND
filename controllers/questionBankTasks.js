const express = require("express");
//models
const User = require("../models/User.model");
const QuestionBank = require("../models/QuestionBank.model");
//middlewares
const asyncWrapper = require("../middleware/async");
//libraries
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
//errors
const {
   InternalServerError,
   NotFoundError,
   UnauthenticatedError,
   BadRequestError,
} = require("../errors");

const createQuestionBank = async (req, res) => {
   var user = req.user;

   const createdBank = await QuestionBank.create({
      title: req.body.formData.title,
      createdBy: mongoose.Types.ObjectId(user.id),
      questions: req.body.questions,
      totalQuestions: req.body.questions.length,
      isFromExam: false,
   });

   if (!createdBank) {
      throw new InternalServerError(
         "Failed to create question bank. Please try again."
      );
   }

   return res.status(200).json({ msg: "success" });
};

const getQuestionBanks = asyncWrapper(async (req, res, next) => {
   var user = req.user;

   const questionBanks = await QuestionBank.find({
      createdBy: mongoose.Types.ObjectId(user.id),
      isFromExam: false, //if isFromExam === false, then it doesnt belong to an exam
   })
      .select("_id title totalQuestions") //specify fields that are included
      .sort("-createdAt"); //sort by date created in descending order

   if (!questionBanks)
      throw new NotFoundError(
         "Something went wrong. Can't find created question banks."
      );

   //questionBanks
   return res
      .status(200)
      .json({ msg: "success", questionBanks: questionBanks });
});

const deleteQuestionBank = asyncWrapper(async (req, res, next) => {
   var user = req.user;

   const bank = await QuestionBank.findById(
      mongoose.Types.ObjectId(req.params.bankId)
   );

   if (!bank) {
      throw new NotFoundError("Question bank not found");
   }

   //check if the bank is created by the requester
   if (String(user.id) !== String(bank.createdBy)) {
      throw new UnauthenticatedError(
         "You are unauthorized to access this resource."
      );
   }

   //delete the exam
   const deletedBank = await QuestionBank.findByIdAndDelete(
      mongoose.Types.ObjectId(req.params.bankId)
   );

   if (!deletedBank) {
      throw new InternalServerError("Failed to delete question bank.");
   }

   res.status(200).json({ msg: "delete success" });
});

const getQuestionBankDetails = asyncWrapper(async (req, res, next) => {
   const questionBank = await QuestionBank.findById(
      mongoose.Types.ObjectId(req.params.bankId)
   );

   if (!questionBank) {
      throw new NotFoundError("Question bank not found.");
   }

   res.json({ msg: "success", questionBank: questionBank });
});

const updateQuestionBank = asyncWrapper(async (req, res, next) => {
   var user = req.user;

   const questionBank = await QuestionBank.findById(
      mongoose.Types.ObjectId(req.params.bankId)
   );

   if (!questionBank) {
      throw new NotFoundError("Question bank not found");
   }

   if (String(user.id) !== String(questionBank.createdBy)) {
      throw new UnauthenticatedError(
         "You are unauthorized to access this resource."
      );
   }

   const updatedQuestionBank = await QuestionBank.findByIdAndUpdate(
      mongoose.Types.ObjectId(req.params.bankId),
      {
         title: req.body.formData.title,
         questions: req.body.questions,
         totalQuestions: req.body.questions.length,
      }
   );

   if (!updatedQuestionBank) {
      throw new InternalServerError("Failed to update question bank.");
   }

   res.status(200).json({ msg: "success" });
});

const getBankNames = asyncWrapper(async (req, res, next) => {
   var user = req.user;

   //convert id strings into ObjectIDs
   const ids = req.body.questionBankIds.map((val) =>
      mongoose.Types.ObjectId(val)
   );

   if (ids.length <= 0 || !ids) {
      throw new BadRequestError("No question bank ids provided");
   }

   const questionBankTitles = await QuestionBank.find({
      _id: { $in: ids },
   }).select("title");

   if (!questionBankTitles) {
      throw new NotFoundError("No question bank titles found");
   }

   res.status(200).json({ msg: "success", questionBankTitles });
});

const checkIfBankInUse = asyncWrapper(async (req, res, next) => {
   //this will contain the instances where the question bank was used in exams
   const bankInstances = await QuestionBank.find({
      questionBanks: {
         $elemMatch: { questionBank: req.params.bankId },
      },
   });

   res.status(200).json({ msg: "success", isUsed: bankInstances.length > 0 });
});

module.exports = {
   createQuestionBank,
   getQuestionBanks,
   deleteQuestionBank,
   getQuestionBankDetails,
   updateQuestionBank,
   getBankNames,
   checkIfBankInUse,
};
