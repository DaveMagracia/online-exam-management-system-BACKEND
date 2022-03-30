const mongoose = require('mongoose')

//CONNECTS TO THE MONGO DATABASE
const connectDB = (url) => {
  return mongoose.connect(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
}

//EXPORT FUNCTION TO BE USED IN SERVER.JS
module.exports = connectDB
