import mongoose from 'mongoose'
const questionSchema = new mongoose.Schema({
	answers: {
		type: Array,
		required: true,
	},
	images: {
		type: Array,
		required: false,
	},
	id_category: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'QuestionCat',
		required: true,
	},
	soalRaw: {
		type: String,
		required: true,
	},
	soalParsed: {
		type: Array,
		required: true,
	},
	discussionRaw: {
		type: String,
		required: true,
	},
	discussionParsed: {
		type: Array,
		required: true,
	},
	reference: {
		type: String,
		required: false,
	},
	id_materi: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Materi',
		required: true,
	},
})

export const Question = mongoose.model('Question', questionSchema)
export default Question
