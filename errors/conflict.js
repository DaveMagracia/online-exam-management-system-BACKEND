const CustomAPIError = require("./custom-error");
const { StatusCodes } = require("http-status-codes");

class ConflictError extends CustomAPIError {
   constructor(message) {
      super(message);
      this.statusCode = StatusCodes.CONFLICT;
   }
}

module.exports = ConflictError;
