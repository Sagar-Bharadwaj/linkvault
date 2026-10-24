import mongoose from 'mongoose';

const clickSchema = new mongoose.Schema(
  {
    link: { type: mongoose.Schema.Types.ObjectId, ref: 'Link', required: true },
    referrer: { type: String, default: 'Direct' },
    browser: { type: String, default: 'Other' },
    device: { type: String, default: 'Desktop' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

clickSchema.index({ link: 1, createdAt: -1 });

export default mongoose.model('Click', clickSchema);
