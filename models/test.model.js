import mongoose from 'mongoose'
const testSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  instances: Array,
  questions: Array,
  isStarted: {
    type: Boolean,
    default: false
  },
  timeLimit: {
    type: Number,
    default: 120
  },
  password: {
    type: String,
    default: '',
    required:false
  },
  randomize: {
    type: Boolean,
    default: false
  }
})

export const Test = mongoose.model('Test', testSchema)