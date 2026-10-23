import mongoose from 'mongoose';

// Schema for shortened URLs
const urlSchema = new mongoose.Schema(
  {
    originalUrl: {
      type: String,
      required: [true, 'Original URL is required'],
      trim: true,
    },
    shortCode: {
      type: String,
      required: [true, 'Short code is required'],
      unique: true,
      index: true,
      trim: true,
    },
    clicks: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // Automatically provides createdAt and updatedAt
  }
);

const Url = mongoose.model('Url', urlSchema);

export default Url;
