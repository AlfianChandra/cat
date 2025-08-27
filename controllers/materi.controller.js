import { Materi } from '../models/materi.model.js'

export const createMateri = async (req, res) => {
	try {
		const { name, capaian, tujuan } = req.body
		const newMateri = new Materi({
			name,
			capaian,
			tujuan,
		})

		await newMateri.save()
		res.status(200).json({ status: 200, message: 'Materi created successfully' })
	} catch (error) {
		console.error('Error creating materi:', error)
		res.status(500).json({ message: 'Internal server error' })
	}
}

export const getMateri = async (req, res) => {
	try {
		const materi = await Materi.find()
		if (materi.length === 0) {
			return res.status(404).json({ message: 'No materi found' })
		}

		res.status(200).json({ status: 200, data: materi })
	} catch (error) {
		console.error('Error fetching materi:', error)
		res.status(500).json({ message: 'Internal server error' })
	}
}

export const updateMateri = async (req, res) => {
	try {
		const { _id, ...fieldsToUpdate } = req.body
		const updatedMateri = await Materi.findByIdAndUpdate(_id, fieldsToUpdate, { new: true })
		if (!updatedMateri) {
			return res.status(404).json({ message: 'Materi not found' })
		}

		res
			.status(200)
			.json({ status: 200, message: 'Materi updated successfully', data: updatedMateri })
	} catch (error) {
		console.error('Error updating materi:', error)
		res.status(500).json({ message: 'Internal server error' })
	}
}

export const deleteMateri = async (req, res) => {
	try {
		const { _id } = req.body
		const deletedMateri = await Materi.findByIdAndDelete(_id)
		if (!deletedMateri) {
			return res.status(404).json({ message: 'Materi not found' })
		}

		res.status(200).json({ status: 200, message: 'Materi deleted successfully' })
	} catch (error) {
		console.error('Error deleting materi:', error)
		res.status(500).json({ message: 'Internal server error' })
	}
}
