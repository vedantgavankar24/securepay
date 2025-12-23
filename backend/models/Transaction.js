const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderUserId: { type: String, required: true },
  receiverUserId: { type: String, required: true },
  amount: { type: Number, required: true },
  senderBalanceAfter: { type: Number },
  receiverBalanceAfter: { type: Number },
  status: { type: String, default: 'COMPLETED' },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', TransactionSchema);