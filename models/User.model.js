const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const User = new mongoose.Schema(
   {
      fullname: {
         type: String,
         required: true,
         unique: false,
      },
      username: {
         type: String,
         required: true,
         unique: true,
      },
      email: {
         type: String,
         required: true,
         unique: true,
      },
      password: {
         type: String,
         required: true,
      },
      userType: {
         type: String,
         required: true,
      },
      profilePicture: {
         type: String,
         required: false,
         default: "",
      },
      todoList: {
         type: Array,
         required: false,
         default: [],
      },
   },
   //name of the collection to save to
   { timestamps: true, collection: "user-data" }
);

//bcrpyt will encrypt password before saving the user into the database
User.pre("save", async function (next) {
   const user = this;
   if (user.isModified("password")) user.password = await bcrypt.hash(user.password, 8);

   next();
});

const model = mongoose.model("UserData", User);
module.exports = model;
