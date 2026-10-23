import mongoose from 'mongoose';

// Schema for tracking individual click events on shortened URLs
const clickSchema = new mongoose.Schema({
  urlId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Url',
    required: true,
    index: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  browser: {
    type: String,
    default: 'Unknown',
  },
  os: {
    type: String,
    default: 'Unknown',
  },
  device: {
    type: String,
    default: 'Desktop',
  },
  referrer: {
    type: String,
    default: 'Direct',
  },
});

const Click = mongoose.model('Click', clickSchema);

export default Click;
