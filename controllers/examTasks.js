const express = require("express");
const asyncWrapper = require("../middleware/async");
//models
const User = require("../models/User.model");
const Exam = require("../models/Exam.model");
const QuestionBank = require("../models/QuestionBank.model");
const ExamRegisters = require("../models/ExamRegisters.model");
//libraries
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { default: ShortUniqueId } = require("short-unique-id"); //library for generating unique code
const schedule = require("node-schedule");
const _ = require("lodash");

//errors
const { InternalServerError, NotFoundError, UnauthenticatedError } = require("../errors");

const createExam = asyncWrapper(async (req, res, next) => {
   var user = req.user;

   var totalPoints = 0;
   totalPoints = req.body.questions.reduce((acc, curr) => {
      //Add only points from exam questions, not from question banks.

      //Every exam has random questions pulled from question banks,
      //those questions may have different points. So it is imposibble to
      //determine beforehand what the total points of the exam will be
      return acc + (!curr.isQuestionBank ? Number(curr.points) : 0);
   }, 0);

   var totalQuestionBankItems = 0;

   //filter questionBanks from questions
   const questionBanks = req.body.questions
      .filter((val) => val.isQuestionBank)
      .map((val) => {
         totalQuestionBankItems += val.numOfItems;
         return {
            //change questionBank object format
            noOfQuestions: val.numOfItems,
            questionBank: mongoose.Types.ObjectId(val.questionBankId),
         };
      });

   const questions = req.body.questions.filter((val) => !val.isQuestionBank);

   //create question bank and save into DB
   const createdBank = await QuestionBank.create({
      createdBy: mongoose.Types.ObjectId(user.id),
      questions: questions,
      questionBanks: questionBanks,
      isFromExam: true,
   });

   if (!createdBank) throw new InternalServerError("Failed to create question bank.");

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
         subject: req.body.exam.subject,
         passingScore: req.body.exam.passingScore,
         date_from: req.body.exam.date_from,
         date_to: req.body.exam.date_to,
         time_limit: req.body.exam.time_limit,
         directions: req.body.exam.directions,
         totalItems: questions.length + totalQuestionBankItems,
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
         //update the existing exam to an "open" state
         const openedExam = await Exam.findByIdAndUpdate(createdExam._id, {
            status: "open",
         });
         if (!openedExam) {
            throw new InternalServerError("Failed to set exam to an open state.");
         }
      });

      schedule.scheduleJob(req.body.exam.date_to, async () => {
         //update the existing exam to a "closed" state
         const closedExam = await Exam.findByIdAndUpdate(createdExam._id, {
            status: "closed",
         });
         if (!closedExam) throw new InternalServerError("Failed to set exam to an closed state.");
      });

      //return the exam code
      return res.status(200).json({ status: "ok", examCode: generatedExamCode });
   } else {
      //create exam and save into DB
      //NOTE: the exam saved is unpublished.
      //No exam code is provided because the exam is not yet published
      const createdExam = await Exam.create({
         createdBy: mongoose.Types.ObjectId(user.id),
         title: req.body.exam.title,
         subject: req.body.exam.subject,
         passingScore: req.body.exam.passingScore,
         date_from: req.body.exam.date_from,
         date_to: req.body.exam.date_to,
         time_limit: req.body.exam.time_limit,
         directions: req.body.exam.directions,
         totalItems: questions.length + totalQuestionBankItems,
         totalPoints: totalPoints,
         questionBankId: createdBank._id,
         status: "unposted", //unposted by default
         examCode: "",
      });

      if (!createdExam) {
         //also delete exam question bank if creating exam fails
         //if exam creation fails then its corresponding questionBank will be unnecessary in the database
         await QuestionBank.findByIdAndDelete(mongoose.Types.ObjectId(createdBank._id));
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
      throw new UnauthenticatedError("You are unauthorized to access this resource.");

   var totalPoints = 0;
   totalPoints = req.body.questions.reduce((acc, curr) => {
      //Add only points from exam questions, not from question banks.

      //Every exam has random questions pulled from question banks,
      //those questions may have different points. So it is imposibble to
      //determine beforehand what the total points of the exam will be
      return acc + (!curr.isQuestionBank ? Number(curr.points) : 0);
   }, 0);

   var totalQuestionBankItems = 0;

   //filter questionBanks from questions
   const questionBanks = req.body.questions
      .filter((val) => val.isQuestionBank)
      .map((val) => {
         totalQuestionBankItems += val.numOfItems;
         return {
            //change questionBank object format
            noOfQuestions: val.numOfItems,
            questionBank: mongoose.Types.ObjectId(val.questionBankId),
         };
      });

   const questions = req.body.questions.filter((val) => !val.isQuestionBank);

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
      const updatedExam = await Exam.findByIdAndUpdate(mongoose.Types.ObjectId(req.params.examId), {
         title: req.body.examData.title,
         subject: req.body.examData.subject,
         passingScore: req.body.examData.passingScore,
         date_from: req.body.examData.date_from,
         date_to: req.body.examData.date_to,
         time_limit: req.body.examData.time_limit,
         directions: req.body.examData.directions,
         totalItems: questions.length + totalQuestionBankItems,
         totalPoints: totalPoints,
         examCode: generatedExamCode,
         status: "posted",
      });

      if (!updatedExam) throw new InternalServerError("Failed to update exam.");
      const updatedQuestionBank = await QuestionBank.findByIdAndUpdate(
         mongoose.Types.ObjectId(updatedExam.questionBankId),
         { questions: questions, questionBanks: questionBanks }
      );

      if (!updatedQuestionBank) throw new InternalServerError("Failed to update question bank.");

      //Schedule when the exam will be opened and closed
      schedule.scheduleJob(req.body.examData.date_from, async () => {
         //update the existing exam to an "open" state
         const openedExam = await Exam.findByIdAndUpdate(updatedExam._id, {
            status: "open",
         });
         if (!openedExam) {
            throw new InternalServerError("Failed to set exam to an open state.");
         }
      });

      schedule.scheduleJob(req.body.examData.date_to, async () => {
         //update the existing exam to a "closed" state
         const closedExam = await Exam.findByIdAndUpdate(updatedExam._id, {
            status: "closed",
         });
         if (!closedExam) throw new InternalServerError("Failed to set exam to an closed state.");
      });

      res.status(200).json({ msg: "success", examCode: generatedExamCode });
   } else {
      //UPDATE THE EXAM
      const updatedExam = await Exam.findByIdAndUpdate(mongoose.Types.ObjectId(req.params.examId), {
         title: req.body.examData.title,
         subject: req.body.examData.subject,
         passingScore: req.body.exam.passingScore,
         date_from: req.body.examData.date_from,
         date_to: req.body.examData.date_to,
         time_limit: req.body.examData.time_limit,
         directions: req.body.examData.directions,
         totalItems: questions.length + totalQuestionBankItems,
         totalPoints: totalPoints,
         status: "unposted",
      });

      if (!updatedExam) throw new InternalServerError("Failed to update exam.");

      //update the question bank
      const updatedQuestionBank = await QuestionBank.findByIdAndUpdate(
         mongoose.Types.ObjectId(updatedExam.questionBankId),
         { questions: questions, questionBanks: questionBanks }
      );

      if (!updatedQuestionBank) throw new InternalServerError("Failed to update question bank.");

      return res.status(200).json({ msg: "success" });
   }
});

//GET ALL EXAMS FROM A SPECIFIC USER
const getExams = asyncWrapper(async (req, res, next) => {
   var user = req.user;

   var exams = [];
   if (user.userType === "student") {
      const examRegisters = await ExamRegisters.find({ user: mongoose.Types.ObjectId(user.id) });

      if (!examRegisters) throw new NotFoundError("No registered exams");
      //extract examCodes into array of strings
      const examCodesArr = examRegisters.map((val) => val.examCode);

      exams = await Exam.find({
         examCode: { $in: examCodesArr },
      });
   } else {
      exams = await Exam.find({
         createdBy: mongoose.Types.ObjectId(user.id),
      })
         .select(
            "_id title date_from date_to totalItems totalPoints status createdAt examCode questionBankId"
         ) //specify fields that are included
         .sort("-createdAt"); //sort by date created in descending order
   }

   if (!exams) throw new NotFoundError("Something went wrong. Can't find created exams.");

   //questionBanks will be used to identify if the exam has a question from another question bank
   const questionBanksArr = exams.map((val) => mongoose.Types.ObjectId(val.questionBankId));

   const questionBanks = await QuestionBank.find({
      _id: { $in: questionBanksArr },
   }).select("-_id questionBanks");

   //map the exams array and put a isQuestionBankEmpty property
   exams = exams.map((val, i) => {
      val = val.toObject();
      return {
         ...val,
         isQuestionBankEmpty: questionBanks[i].length === 0,
      };
   });

   return res.status(200).json({ exams });
});

const getExamDetails = asyncWrapper(async (req, res, next) => {
   var user = req.user;

   if (user.userType === "student") {
      const exam = await Exam.findById(mongoose.Types.ObjectId(req.params.examId));

      if (!exam) throw new NotFoundError("Exam not found.");

      //check if student is a registered student for this exam
      //if there is a result returned, then the student is permitted to access the exam details
      const isRegistered = await ExamRegisters.findOne({
         user: mongoose.Types.ObjectId(user.id),
         examCode: exam.examCode,
      });

      if (!isRegistered) {
         throw new UnauthenticatedError("You are unauthorized to access this resource.");
      }

      //get list of students
      const registeredStudents = await ExamRegisters.find({
         examCode: exam.examCode,
      });

      const studentIds = registeredStudents.map((val) => val.user);

      const users = await User.find({
         _id: { $in: studentIds },
      }).select("-password -userType -updatedAt");

      if (!users) throw new NotFoundError("Users not found.");

      const faculty = await User.findById(exam.createdBy).select("-_id username");

      //question bank will be used to identify if qbank from exam is dependent on other qbanks
      //if dependent, show + on total points on the frontend
      const examQuestionBank = await QuestionBank.findOne({
         _id: mongoose.Types.ObjectId(exam.questionBankId),
      }).select("-_id questionBanks");

      return res.status(200).json({
         exam: exam,
         students: users,
         faculty: faculty.username,
         studentInfos: [],
         isQuestionBankEmpty: examQuestionBank.questionBanks.length === 0,
         registeredExamStatus: isRegistered.status, //will determine if the status has attempted, or submitted the exam
      });
   } else {
      const exam = await Exam.findById(mongoose.Types.ObjectId(req.params.examId));
      if (!exam) throw new NotFoundError("Exam not found.");
      /*For security, check if the exam is created by the requester
        if the exam is not created by the requester, then respond with error 403 (forbidden)
   
        cast the IDs to string first because the IDs are objects
        omparing two objects with === will return false because they are 2 different objects with the same value*/
      if (String(user.id) !== String(exam.createdBy))
         throw new UnauthenticatedError("You are unauthorized to access this resource.");
      const questionBank = await QuestionBank.findById(exam.questionBankId);
      if (!questionBank) throw new NotFoundError("Question bank not found.");

      //get list of students
      const registeredStudents = await ExamRegisters.find({
         examCode: exam.examCode,
      }).select("-examCode -createdAt -updatedAt -__v"); //exclude fields

      var studentIds = [];
      var studentInfos = [];
      var users = [];

      if (registeredStudents.length > 0) {
         studentIds = registeredStudents.map((val) => val.user);

         studentInfos = registeredStudents.map((val) => {
            if (val.status === "unanswered" || val.status === "attempted") {
               return {
                  user: val.user,
                  status: val.status,
               };
            }

            let examDetails = val.details.exam;
            return {
               user: val.details.userId,
               status: val.status,
               totalScore: examDetails.totalScore,
               totalItems: examDetails.totalItems,
               totalPoints: examDetails.totalPoints,
               passingScore: examDetails.passingScore,
               finishedTime: examDetails.finishedTime,
               startedTime: examDetails.startedTime,
            };
         });

         users = await User.find({
            _id: { $in: studentIds },
         }).select("-password -userType -updatedAt");

         if (!users) throw new NotFoundError("Users not found.");
      }

      //question bank will be used to identify if qbank from exam is dependent on other qbanks
      //if dependent, show + on total points on the frontend
      const examQuestionBank = await QuestionBank.findOne({
         _id: mongoose.Types.ObjectId(exam.questionBankId),
      }).select("-_id questionBanks");

      return res.status(200).json({
         exam: exam,
         questionBank: questionBank,
         faculty: "You",
         students: users,
         isQuestionBankEmpty: examQuestionBank.questionBanks.length === 0,
         studentInfos: studentInfos,
      });
   }
});

const deleteExam = asyncWrapper(async (req, res, next) => {
   var user = req.user;

   const exam = await Exam.findById(mongoose.Types.ObjectId(req.params.examId));
   if (!exam) throw new NotFoundError("Exam not found.");

   //check if the exam is created by the requester
   if (String(user.id) !== String(exam.createdBy))
      throw new UnauthenticatedError("You are unauthorized to access this resource.");

   //delete the exam
   const deletedExam = await Exam.findByIdAndDelete(mongoose.Types.ObjectId(req.params.examId));

   if (!deletedExam) throw new InternalServerError("Failed to delete exam.");

   //delete the exam's corresponding question bank
   const deletedQuestionBank = await QuestionBank.findByIdAndDelete(
      mongoose.Types.ObjectId(deletedExam.questionBankId)
   );

   if (!deletedQuestionBank) throw new InternalServerError("Failed to delete exam question bank.");

   res.status(200).json({ msg: "delete success" });
});

const getSubjects = asyncWrapper(async (req, res, next) => {
   var user = req.user;

   var subjects = []; //set initially to null
   var facultyNames = [];

   //get subjects through the registered exams
   if (user.userType === "student") {
      //get all registered exams from requester
      const registeredExams = await ExamRegisters.find({
         user: user.id,
      }).select("examCode");

      if (!registeredExams) throw new NotFoundError("No registered exams");

      //extract the examCode from the returned object and put in array
      const examCodesArr = registeredExams.map((val) => val.examCode);
      //find exams through examCode
      subjects = await Exam.find({
         examCode: { $in: examCodesArr },
      })
         .select("subject title date_from status createdBy") //specify fields that are included
         .sort("-createdAt"); //sort by date created in descending order

      if (!subjects) throw new NotFoundError("Something went wrong. Can't find exams.");

      //from the exams found, extract the createdBy IDs and put into array to get their usernames
      const facultyIdsArr = subjects.map((val) => mongoose.Types.ObjectId(val.createdBy));

      //get the usernames of the faculty
      facultyNames = await User.find({
         _id: { $in: facultyIdsArr },
      }).select("username");
   } else {
      //get subjects from Exam collection because there are no collection for subjects
      subjects = await Exam.find({
         createdBy: mongoose.Types.ObjectId(user.id),
      })
         .select("subject title date_from status") //specify fields that are included
         .sort("-createdAt"); //sort by date created in descending order

      if (!subjects) throw new NotFoundError("Something went wrong. Can't find created exams.");
   }

   // inner function
   function getIsUpcoming(curr, currentTime) {
      //the obj returned will be pushed to upcomingExams array

      //the exam needs to be :
      //date_from must be 3 days from now
      //status must be unposted
      if (curr.date_from.getTime() - currentTime <= 259200000) {
         if (curr.status === "posted") {
            const obj = {
               id: curr._id,
               title: curr.title,
               date_from: curr.date_from,
            };
            return obj;
         }
         return;
      }
      return;
   }

   //the following codes will get the subject name based on the exams got and how many exams there are in each subject
   //in addition, identify the upcoming exams
   const currentTime = new Date().getTime();
   const subjectOccurences = subjects.reduce((acc, curr) => {
      //find the index on the accumulator to check if the subject already exists
      const index = acc.findIndex((el) => el.subject === curr.subject);
      const upcomingExam = getIsUpcoming(curr, currentTime);

      return (
         index + 1 //check if the subject already exists in the array; +1 so that if ever index is 0, it is not false; -1 if not found
            ? (acc[index] = {
                 ...acc[index],
                 examCount: acc[index].examCount + 1,
                 upcomingExams: [...acc[index].upcomingExams, upcomingExam].filter(Boolean), //remove undefined values
              }) //if the subj already exists, just increment the examCount property
            : acc.push({
                 subject: curr.subject,
                 ...(user.userType === "student" && {
                    createdBy: facultyNames.find(
                       (el) => String(el._id) === String(curr.createdBy) //compare by string because IDs of mongoose are objects
                    ).username,
                 }), //add property only if requester is a student
                 examCount: 1,
                 upcomingExams: [upcomingExam].filter(Boolean), //remove undefined values
              }), //else push a new obj
         acc
      );
   }, []);
   return res.status(200).json({ subjects: subjectOccurences });
});

const getExamsFromSubject = asyncWrapper(async (req, res, next) => {
   var user = req.user;
   var exams = [];

   if (user.userType === "student") {
      //get exams registered by student
      const examRegisters = await ExamRegisters.find({
         user: mongoose.Types.ObjectId(user.id),
      });

      if (!examRegisters) throw new NotFoundError("No registered exams");
      //extract examCodes into array of strings
      const examCodesArr = examRegisters.map((val) => val.examCode);

      exams = await Exam.find({
         examCode: { $in: examCodesArr },
         subject: req.params.subjectName,
      });
   } else {
      exams = await Exam.find({
         createdBy: mongoose.Types.ObjectId(user.id),
         subject: req.params.subjectName,
      })
         .select(
            "_id title date_from date_to totalItems totalPoints status createdAt examCode questionBankId"
         ) //specify fields that are included
         .sort("-createdAt"); //sort by date created in descending order
   }

   if (!exams) throw new NotFoundError("Something went wrong. Can't find exams.");

   //questionBanks will be used to identify if the exam has a question from another question bank
   const questionBanksArr = exams.map((val) => mongoose.Types.ObjectId(val.questionBankId));

   const questionBanks = await QuestionBank.find({
      _id: { $in: questionBanksArr },
   }).select("-_id questionBanks");

   //map the exams array and put a isQuestionBankEmpty property
   exams = exams.map((val, i) => {
      val = val.toObject();
      return {
         ...val,
         isQuestionBankEmpty: questionBanks[i].length === 0,
      };
   });

   res.status(200).json({ msg: "success", exams: exams });
});

const getSubjectNames = asyncWrapper(async (req, res, next) => {
   var user = req.user;

   var exams = [];

   if (user.userType === "student") {
      //get exams registered by student
      const examRegisters = await ExamRegisters.find({
         user: mongoose.Types.ObjectId(user.id),
      });

      if (!examRegisters) throw new NotFoundError("No registered exams");
      //extract examCodes into array of strings
      const examCodesArr = examRegisters.map((val) => val.examCode);

      exams = await Exam.find({
         examCode: { $in: examCodesArr },
      });
   } else {
      //get subjects from Exam collection because there are no collection for subjects
      exams = await Exam.find({
         createdBy: mongoose.Types.ObjectId(user.id),
      })
         .select("subject title date_from status") //specify fields that are included
         .sort("-createdAt"); //sort by date created in descending order
   }

   if (!exams) throw new NotFoundError("Something went wrong. Can't find exams.");

   //from all the exams, reduce to an array that contains only strings of subjects (no duplicates)
   const subjectNames = exams.reduce((acc, curr) => {
      if (!acc.includes(curr.subject)) acc.push(curr.subject);
      return acc;
   }, []);

   res.status(200).json({ subjectNames });
});

const startExam = asyncWrapper(async (req, res, next) => {
   const user = req.user;
   var examRegistered = null;

   const exam = await Exam.findById(mongoose.Types.ObjectId(req.params.examId));
   if (!exam) throw new NotFoundError("Exam not found");

   const findExamRegistered = await ExamRegisters.findOne({
      user: user.id,
      examCode: exam.examCode,
   });

   if (!findExamRegistered) throw new NotFoundError("Exam not found");

   //only set the status "attempted" when the exam hasnt been answered yet
   if (findExamRegistered.status === "unanswered") {
      examRegistered = await ExamRegisters.findOneAndUpdate(
         { user: user.id, examCode: exam.examCode },
         { status: "attempted" } //this is important to prevent the student from re-taking the exam
      );
      if (!examRegistered) throw new InternalServerError("Failed to update registered exam status");
   } else {
      examRegistered = findExamRegistered;
   }

   var questionBank = await QuestionBank.findById(exam.questionBankId);
   if (!questionBank) throw new NotFoundError("Question Bank not found");

   //empty array which will contain random questions from the banks
   var questionsFromBanks = [];

   //get question bank references if questionBanks array is not empty
   if (questionBank.questionBanks.length > 0)
      for (const bankRef of questionBank.questionBanks) {
         //get all questions from
         const questionsFromBank = await QuestionBank.findById(
            mongoose.Types.ObjectId(bankRef.questionBank)
         ).select("-_id questions");
         if (!questionBank) throw new NotFoundError("Questions not found");

         //shuffle the array of questions using lodash shuffle function
         const shuffledQuestions = _.shuffle(questionsFromBank.questions);

         // slice the array
         const slicedQuestionArr = shuffledQuestions.slice(0, bankRef.noOfQuestions);

         questionsFromBanks = [...questionsFromBanks, ...slicedQuestionArr]; //push the questions to the exam question bank
      }

   res.status(200).json({
      msg: "success",
      exam: exam,
      questions: questionBank.questions,
      questionsFromBanks: questionsFromBanks,
      registeredExamStatus: examRegistered.status,
   });
});

const generateTOS = asyncWrapper(async (req, res, next) => {
   const user = req.user;

   const exam = await Exam.findById(mongoose.Types.ObjectId(req.params.examId));
   if (!exam) throw new NotFoundError("Exam not found");

   var questionBank = await QuestionBank.findById(exam.questionBankId);
   if (!questionBank) throw new NotFoundError("Question Bank not found");

   //empty array which will contain random questions from the banks
   var questionsFromBanks = [];

   //get question bank references if questionBanks array is not empty
   if (questionBank.questionBanks.length > 0) {
      for (const bankRef of questionBank.questionBanks) {
         //get all questions from
         const questionsFromBank = await QuestionBank.findById(
            mongoose.Types.ObjectId(bankRef.questionBank)
         ).select("-_id questions");
         if (!questionBank) throw new NotFoundError("Questions not found");

         //shuffle the array of questions using lodash shuffle function
         const shuffledQuestions = _.shuffle(questionsFromBank.questions);

         // slice the array
         const slicedQuestionArr = shuffledQuestions.slice(0, bankRef.noOfQuestions);

         questionsFromBanks = [...questionsFromBanks, ...slicedQuestionArr]; //push the questions to the exam question bank
      }
   }

   //get username
   const faculty = await User.findById(exam.createdBy);

   if (!faculty) throw new NotFoundError("User (Faculty) not found.");
   const facultyUsername = faculty.username;

   res.status(200).json({
      msg: "success",
      exam: exam,
      facultyUsername: facultyUsername,
      questions: questionBank.questions,
      questionsFromBanks: questionsFromBanks,
   });
});

const submitExam = asyncWrapper(async (req, res, next) => {
   const user = req.user;
   var submittedExam = null;

   try {
      submittedExam = await ExamRegisters.findOneAndUpdate(
         {
            user: user.id,
            examCode: req.body.details.exam.examCode,
         },
         {
            details: req.body.details,
            status: "submitted",
         }
      );
   } catch (error) {
      throw new InternalServerError("Failed to submit the exam");
   }

   if (!submittedExam) throw new InternalServerError("Failed to submit the exam");

   res.status(200).json({ msg: "success" });
});

const getDates = asyncWrapper(async (req, res, next) => {
   var user = req.user;

   var exams = [];
   if (user.userType === "student") {
      const examRegisters = await ExamRegisters.find({ user: mongoose.Types.ObjectId(user.id) });

      if (!examRegisters) throw new NotFoundError("No registered exams");
      //extract examCodes into array of strings
      const examCodesArr = examRegisters.map((val) => val.examCode);

      const statuses = ["posted", "open"];

      exams = await Exam.find({
         examCode: { $in: examCodesArr },
         status: { $in: statuses },
      });
   } else {
      const statuses = ["posted", "open"];

      exams = await Exam.find({
         createdBy: mongoose.Types.ObjectId(user.id),
         status: { $in: statuses },
      })
         .select(
            "_id title date_from date_to totalItems totalPoints status createdAt examCode questionBankId"
         ) //specify fields that are included
         .sort("-createdAt"); //sort by date created in descending order
   }

   if (!exams) throw new NotFoundError("Something went wrong. Can't find created exams.");

   //questionBanks will be used to identify if the exam has a question from another question bank
   const questionBanksArr = exams.map((val) => mongoose.Types.ObjectId(val.questionBankId));

   const questionBanks = await QuestionBank.find({
      _id: { $in: questionBanksArr },
   }).select("-_id questionBanks");

   //map the exams array and put a isQuestionBankEmpty property
   exams = exams.map((val, i) => {
      val = val.toObject();
      return {
         ...val,
         isQuestionBankEmpty: questionBanks[i].length === 0,
      };
   });

   return res.status(200).json({ exams });
});

const getStudentResults = asyncWrapper(async (req, res, next) => {
   const user = req.user;

   const studentResults = await ExamRegisters.findOne({
      user: mongoose.Types.ObjectId(req.params.userId),
      examCode: req.params.examCode,
   });

   if (!studentResults) throw new NotFoundError("No results found");

   return res.status(200).json({ msg: "success", results: studentResults.details });
});

module.exports = {
   createExam,
   getExams,
   getExamDetails,
   updateExam,
   deleteExam,
   getSubjects,
   getSubjectNames,
   getExamsFromSubject,
   startExam,
   generateTOS,
   submitExam,
   getDates,
   getStudentResults,
};
