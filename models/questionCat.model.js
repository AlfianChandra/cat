import mongoose from 'mongoose';
const questionCatModelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
})

export const QuestionCat = mongoose.model('QuestionCat', questionCatModelSchema);
export default QuestionCat;