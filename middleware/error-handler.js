//THIS IS A CUSTOM ERROR HANDLER
const errorHandler = (err, req, res, next) => {
   console.log(err.message);
   return res.status(err.status).json({ msg: err.message });
};

module.exports = errorHandler;
