const mongoose = require('mongoose')

//CONNECTS TO THE MONGO DATABASE
const connectDB = (url) => {
  return mongoose.connect(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
}

module.exports = connectDB
