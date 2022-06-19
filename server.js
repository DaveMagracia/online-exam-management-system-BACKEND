//IMPORTS
//environment variables
require("dotenv").config();
require("express-async-errors");

const express = require("express");
const cors = require("cors");
const server = express();

const connectDB = require("./db/connect");
const userRoute = require("./routes/user");
const examRoute = require("./routes/exam");
const adminRoute = require("./routes/admin");
const questionBankRoute = require("./routes/bank");
const notFoundMiddleware = require("./middleware/not-found");
const errorHandlerMiddleware = require("./middleware/error-handler");

// MIDDLEWARES
// server.use(express.static('./public'));
//lets express know that incoming requests are in json form. without this jsons will be undefined
server.use(express.json());
//for security measures
server.use(cors());
//if '/user' comes after the base URL, the userRoute will handle the request
server.use("/user", userRoute);
server.use("/exams", examRoute);
server.use("/admin", adminRoute);
server.use("/question-banks", questionBankRoute);
//error handler middleware
server.use(notFoundMiddleware);
server.use(errorHandlerMiddleware);

const port = process.env.PORT || 5000;

// ASYNC FUNCTION TO WAIT DB CONNECTION BEFORE STARTING THE SERVER
const start = async () => {
   try {
      await connectDB(process.env.MONGO_URI);
      server.listen(port, () => {
         console.log(`Server is listening on port ${port}...`);
      });
   } catch (error) {
      console.log(error);
   }
};

start();
