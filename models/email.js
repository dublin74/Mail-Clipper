const mongoose = require('mongoose');

const EmailSchema = new mongoose.Schema({
  id: String,
  threadId: String,
  labelIds: [String],
  personName: String,
  personEmail: String,
  date: Date,
  time: String,
  from: String,
  subject: String,
  content: String,
  summary: {
    summary: String,
    sentiment: String,
    motive: [String],
    severity: String
  }
});


module.exports = mongoose.model('Email', EmailSchema);