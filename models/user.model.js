import mongoose from "mongoose";
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  phone: {
    type: String,
    required: false,
  },
  dob: {
    type: String,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  google_signin: {
    type: Boolean,
    default: false,
  },
  avatar: {
    type: String,
    default: null,
  },
  google_avatar: {
    type: String,
    default: null,
  },
  role: {
    type: String,
    enum: ['user', 'webmaster'],
    required: true
  },
  id_participant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Participant',
    default: null,
    required: false
  }
})

export const User = mongoose.model("User", userSchema);