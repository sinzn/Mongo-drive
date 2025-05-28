const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  originalName: String,
  filename: String,
  userId: mongoose.Schema.Types.ObjectId
}, { timestamps: true }); // <-- this adds createdAt and updatedAt

module.exports = mongoose.model('File', fileSchema);
