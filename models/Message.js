const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const messageSchema = new Schema({
  sender: { type: String },
  message: { type: String },
  sentTime: { type: String },
});
const Message = mongoose.model("Message", messageSchema);
module.exports = { Message };
