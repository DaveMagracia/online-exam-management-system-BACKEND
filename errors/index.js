const CustomAPIError = require("./custom-error");
const BadRequestError = require("./bad-request");
const UnauthenticatedError = require("./unauthenticated");
const InternalServerError = require("./internal-server-error");
const NotFoundError = require("./not-found");

module.exports = {
   CustomAPIError,
   BadRequestError,
   UnauthenticatedError,
   InternalServerError,
   NotFoundError,
};
