//THIS FILE CONTAINS ALL THE HANDLERS/FUNCTIONS FOR "/user" ROUTES
const express = require("express");
//models
const User = require("../models/User.model");
const Exam = require("../models/Exam.model");
const ExamRegisters = require("../models/ExamRegisters.model");
//middlewares
const asyncWrapper = require("../middleware/async");
//libraries
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const {
   NotFoundError,
   UnauthenticatedError,
   InternalServerError,
   ConflictError,
} = require("../errors");

const registerUser = async (req, res, next) => {
   //get the request body then extract its contents to create a User in the database
   try {
      await User.create({
         username: req.body.username,
         email: req.body.email,
         password: req.body.pass,
         userType: req.body.userType,
      });
   } catch (err) {
      //MongoServerError: E11000 duplicate key error collection
      //Code 409: 409 Conflict - This response is sent when a request conflicts with the current state of the server.
      if (err.code === 11000) {
         const error = new Error("Username/Email already exists");
         error.status = 409;
         return next(error);
      }

      //Code 500: 500 Internal Server Error - The server has encountered a situation it does not know how to handle.
      const error2 = new Error("Something went wrong. Please try again.");
      error2.status = 500;
      return next(error2);
   }

   res.status(200).json({ status: "ok" });
};

// the "asyncWrapper" will make the code shorter.
// It will prevent the repetitive use of the try/catch block which makes code longer
const loginUser = asyncWrapper(async (req, res, next) => {
   //check if input is email or username
   let emailRegex =
      /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
   let email_username = req.body.email_username;
   let isEmail = emailRegex.test(email_username);

   const user = await User.findOne({
      //if input is an email find for 'email' property, else find for username
      [isEmail ? "email" : "username"]: email_username,
   });

   if (!user) throw new NotFoundError("No such user exists.");

   //bcrpyt will compare the actual password input, with the encrypted password in the database
   const isMatch = await bcrypt.compare(req.body.pass, user.password);
   //if user is not found
   if (!isMatch) throw new UnauthenticatedError("Invalid credentials.");

   //if user exists, then create a token
   //The jwt token's purpose is to send back a base64 encoded response containing the info of the user

   //example of sent token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6Im1hcmtkYXZoZWVkQGdtYWlsLmNvbSIsInVzZXJuYW1lIjoiTmV3VXNlcjEiLCJpYXQiOjE2NDg5ODM5MTB9.QyKMJDLmNBQJP9u09eb2A5yV9ihD5NzyUWbCyYxytZY"
   //the string between the two periods are the encrypted info
   //to test, perform an atob('string') on the chrome console
   const userToken = jwt.sign(
      {
         id: user._id,
         email: user.email,
         username: user.username,
         userType: user.userType,
      },
      process.env.JWT_SECRET_KEY
   );

   return res.json({ status: "ok", user: userToken });
});

const getUserInfo = async (req, res, next) => {
   var userObj = req.user;
   const user = await User.findOne({
      _id: mongoose.Types.ObjectId(userObj.id),
   });

   if (!user) throw new NotFoundError("User not found.");

   //send back user info
   res.json({
      id: user._id,
      email: user.email,
      username: user.username,
      userType: user.userType,
   });
};

const registerCode = asyncWrapper(async (req, res, next) => {
   const user = req.user;

   //find first if the code provided is a code of an existing exam
   const exam = await Exam.findOne({ examCode: req.body.examCode });

   if (!exam) throw new NotFoundError("No exam with such code exists.");

   const isUserRegistered = await ExamRegisters.findOne({
      user: mongoose.Types.ObjectId(user.id),
      examCode: req.body.examCode,
   });

   //if the it exists, then the user is already registered to specified exam
   if (isUserRegistered)
      throw new ConflictError("You are already registered to this exam.");

   const registeredExam = await ExamRegisters.create({
      user: mongoose.Types.ObjectId(user.id),
      examCode: req.body.examCode,
   });

   if (!registeredExam)
      throw new InternalServerError("Failed to register exam");

   return res.status(200).json({ msg: "success" });
});

const updateProfile = asyncWrapper(async (req, res, next) => {
   const user = req.user;

   const updatedUser = await User.findByIdAndUpdate(
      mongoose.Types.ObjectId(user.id),
      {
         username: req.body.username,
         email: req.body.email,
      },
      { new: true } //option to return the updated document because the default returns the original/unaltered version before the update
   );

   if (!updatedUser) throw new InternalServerError("Failed to update profile");

   const userToken = jwt.sign(
      {
         id: updatedUser._id,
         email: updatedUser.email,
         username: updatedUser.username,
         userType: updatedUser.userType,
      },
      process.env.JWT_SECRET_KEY
   );

   res.status(200).json({ msg: "success", token: userToken });
});

const changePassword = asyncWrapper(async (req, res, next) => {
   const user = req.user;
   const findUser = await User.findOne({
      _id: mongoose.Types.ObjectId(user.id),
   });

   if (!findUser) throw new NotFoundError("User not found.");

   //check first if old password is correct
   const isMatch = await bcrypt.compare(req.body.pass, findUser.password);
   //if user is not found
   if (!isMatch) throw new UnauthenticatedError("Incorrect password.");

   //hash the new password and set it as the new password
   const newHashedPassword = await bcrypt.hash(req.body.newpass, 8);

   const updatedUser = await User.findByIdAndUpdate(
      mongoose.Types.ObjectId(findUser._id),
      { password: newHashedPassword }
   );

   if (!updatedUser)
      throw new InternalServerError("Failed to update password.");

   res.status(200).json({ msg: "success" });
});

//export the functions to be used in routes/user.js
module.exports = {
   registerUser,
   loginUser,
   getUserInfo,
   registerCode,
   updateProfile,
   changePassword,
};
