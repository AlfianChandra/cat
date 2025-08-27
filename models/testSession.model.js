import mongoose from 'mongoose'
const testSessionSchema = new mongoose.Schema({
	id_user: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
	},
	id_participant: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
	},
	id_test: {
		type: mongoose.Schema.Types.ObjectId,
	},
	start: {
		type: Date,
		required: true,
	},
	end: {
		type: Date,
		required: true,
	},
	payload: {
		type: Array,
		required: true,
	},
	session_token: {
		type: String,
		required: true,
	},
	question_done: {
		type: Array,
		required: false,
		default: [],
	},
	test_status: {
		type: String,
		enum: ['not_started', 'in_progress', 'completed'],
		default: 'not_started',
	},
	state: {
		type: Object,
		default: {},
	},
})

export const TestSession = mongoose.model('TestSession', testSessionSchema)
