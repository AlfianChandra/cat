import mongoose from 'mongoose'
const materiSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
	},
	capaian: {
		type: String,
		required: true,
	},
	tujuan: {
		type: String,
		required: true,
	},
})

export const Materi = mongoose.model('Materi', materiSchema);
export default Materi;