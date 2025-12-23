const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  action: { type: String, required: true },
  details: { type: String, required: true },
  status: { type: String, enum: ['SUCCESS', 'FAILURE'], required: true },
  senderId: { type: String },
  receiverId: { type: String },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);