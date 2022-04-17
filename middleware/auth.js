const jwt = require("jsonwebtoken");
const { UnauthenticatedError } = require("../errors");

const authenticationMiddleware = async (req, res, next) => {
   //MIDDLEWARE TO AUTHENTICATE USER BEFORE ACCESSING A CERTAIN ROUTE
   const authHeader = req.headers.authorization;

   if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthenticatedError("No token provided");
   }

   const token = authHeader.split(" ")[1];

   try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
      const { id, email, username, userType } = decoded;
      req.user = { id, email, username, userType }; //put a user object on the request
      next();
   } catch (error) {
      throw new UnauthenticatedError("Not authorized to access this route");
   }
};

module.exports = authenticationMiddleware;
