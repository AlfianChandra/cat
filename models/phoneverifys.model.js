import mongoose from "mongoose";
const phoneVerifySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  code: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Date,
    default: () => new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" })),
  },
  verified: {
    type: Boolean,
    default: false,
  },
});
export const PhoneVerify = mongoose.model("PhoneVerify", phoneVerifySchema);
export default PhoneVerify;