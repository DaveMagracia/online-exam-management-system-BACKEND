//THIS IS A CUSTOM ERROR HANDLER
// const errorHandler = (err, req, res, next) => {
//    console.log(err.message);
//    return res.status(err.status).json({ msg: err.message });
// };

// module.exports = errorHandler;

const { CustomAPIError } = require("../errors");
const { StatusCodes } = require("http-status-codes");

const errorHandlerMiddleware = (err, req, res, next) => {
   if (err instanceof CustomAPIError) {
      return res.status(err.statusCode).json({ msg: err.message });
   }

   return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .send("Something went wrong. Try again later.");
};

module.exports = errorHandlerMiddleware;
