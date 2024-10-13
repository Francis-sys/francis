const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const citizenSchema = new Schema({
  username: { type: String },
  fullname: { type: String },
  password: { type: String },
  status: { 
    type: String, 
    enum: ['OK', 'Help', 'Emergency', 'Undefined'], // Possible statuses
    default: 'Undefined'  // Default status if no status is selected
  },
  isOnline: { type: Boolean, default: false }, // Whether the citizen is online or offline
  statusLastUpdated: { type: Date, default: Date.now }, // Timestamp for status update
});

// Pre-save hook to update the timestamp whenever the status is modified
citizenSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    this.statusLastUpdated = Date.now();
  }
  next();
});
const Citizen = mongoose.model("Citizen", citizenSchema);
module.exports = { Citizen };
