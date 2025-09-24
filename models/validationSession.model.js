import mongoose from 'mongoose'
const valSchema = mongoose.Schema({
	id_user: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
		ref: 'User',
	},
	id_participant: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
		ref: 'Participant',
	},
	id_category: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
		ref: 'QuestionCat',
	},
	start: {
		type: Date,
		required: true,
	},
	end: {
		type: Date,
		required: true,
	},
	test_status: {
		type: String,
		enum: ['not_started', 'in_progress', 'completed'],
		default: 'not_started',
	},
	question_done: {
		type: Array,
		required: false,
		default: [],
	},
	state: {
		type: Object,
		default: {},
	},
})

export const ValidationSession = mongoose.model('ValidationSession', valSchema)
export default ValidationSession
