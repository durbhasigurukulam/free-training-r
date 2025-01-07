const mongoose = require('mongoose');
// const { v4: uuidv4 } = require('uuid');

const SessionSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: '1h', // Session will automatically be removed after 1 hour
  },
});

const Session = mongoose.model('Session', SessionSchema);

module.exports = Session;