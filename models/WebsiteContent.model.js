const mongoose = require("mongoose");

const WebsiteContent = new mongoose.Schema(
   {
      name: {
         type: String,
         required: true,
         unique: false,
         default: "content",
      },
      logo: {
         type: String,
         required: true,
         default: "ExamplifyLogo.png",
         unique: false,
      },
      title: {
         type: String,
         required: true,
         unique: false,
      },
      announcements: {
         type: String,
         required: true,
         unique: true,
      },
      vision: {
         type: String,
         required: true,
         unique: true,
      },
      mission: {
         type: String,
         required: true,
      },
      go: {
         type: String,
         required: true,
         unique: true,
      },
      isVisionEnabled: {
         type: Boolean,
         required: true,
         default: true,
      },
      isMissionEnabled: {
         type: Boolean,
         required: true,
         default: true,
      },
      isGoEnabled: {
         type: Boolean,
         required: true,
         default: true,
      },
   },
   //name of the collection to save to
   { timestamps: true, collection: "website-content" }
);

const model = mongoose.model("WebsiteContent", WebsiteContent);
module.exports = model;
