import mongoose from 'mongoose';

const linkSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    url: { type: String, required: true },
    owner: { type: String, required: true, index: true },
    clicks: { type: Number, default: 0 },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Link', linkSchema);
