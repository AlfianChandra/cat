import mongoose from 'mongoose';
const instanceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  instance_id: {
    type: String,
    required: true,
    unique: true,
  },
  address: {
    type: String,
    required: true,
  },
  jenjang: {
    type: String,
    required: true,
  },
})

export const Instance = mongoose.model('Instance', instanceSchema);
export default Instance;