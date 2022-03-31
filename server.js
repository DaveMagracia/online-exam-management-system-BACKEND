const express = require('express')
const cors = require('cors')
const connectDB = require('./db/connect');
const server = express();

// middlewares
server.use(express.static('./public'));
//lets express know that incoming requests are in json form
server.use(express.json());
//for security measures
server.use(cors());

require('dotenv').config();


const port = process.env.PORT || 5000;

// ASYNC FUNCTION TO WAIT DB CONNECTION BEFORE STARTING THE SERVER
const start = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    server.listen(port, () => {
      console.log(`Server is listening on port ${port}...`)
    });
  } catch (error) {
    console.log(error);
  }
};

start();