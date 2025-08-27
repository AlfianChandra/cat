import mongoose from 'mongoose';
const participantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  kelas: {
    type: String,
    required: true,
  },
  id_instansi: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  jurusan: {
    type: String,
    required: true,
  },
  username_string: {
    type: String,
    required: false,
    default: null,
  },
  password_string: {
    type: String,
    required: false,
    default: null,
  },
})

export const Participant = mongoose.model('Participant', participantSchema);
export default Participant;