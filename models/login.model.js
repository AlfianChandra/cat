import mongoose from "mongoose";
const loginSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  token: {
    type: String,
    required: true,
  },
  ipAddress: {
    type: String,
    required: true,
  },
  method: {
    type: String,
    required: true,
  },
  userAgent: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
});
export const Login = mongoose.model("Login", loginSchema);