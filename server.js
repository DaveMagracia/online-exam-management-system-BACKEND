const express = require('express')
const cors = require('cors')
const connectDB = require('./db/connect');
const app = express();

// middleware
app.use(express.static('./public'));
app.use(express.json());

require('dotenv').config();


const port = process.env.PORT || 5000;

// ASYNC FUNCTION TO WAIT DB CONNECTION BEFORE STARTING THE SERVER
const start = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    app.listen(port, () =>
      console.log(`Server is listening on port ${port}...`)
    );
  } catch (error) {
    console.log(error);
  }
};

start();