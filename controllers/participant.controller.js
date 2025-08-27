import { Participant } from '../models/participant.model.js'
import { User } from '../models/user.model.js'
import { TestSession } from '../models/testSession.model.js'
import bcrypt from 'bcrypt'

export const optoutParticipant = async (req, res) => {
	try {
		const { id_participant } = req.body
		const participant = await Participant.findById(id_participant)
		if (!participant) {
			return res.status(404).json({ status: 404, message: 'Peserta tidak ditemukan' })
		}

		const user = await User.findOne({ id_participant: id_participant })
		if (!user) {
			return res
				.status(404)
				.json({ status: 404, message: 'Peserta tidak terdaftar sebagai pengguna' })
		}

		await user.deleteOne()
		participant.username_string = ''
		participant.password_string = ''
		await participant.save()
		return res.status(200).json({ status: 200, message: 'Peserta berhasil dihapus dari pengguna' })
	} catch (error) {
		console.error('Error opting out participant:', error)
		return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' })
	}
}

export const optinParticipant = async (req, res) => {
	try {
		const { name, password, email, id_participant } = req.body
		const participant = await Participant.findById(id_participant)
		if (!participant) {
			return res.status(404).json({ status: 404, message: 'Peserta tidak ditemukan' })
		}

		const existingUser = await User.findOne({ id_participant: id_participant })
		if (existingUser) {
			return res
				.status(400)
				.json({ status: 400, message: 'Peserta sudah terdaftar sebagai pengguna' })
		}

		const hashPassword = await bcrypt.hash(password, 10)
		const newUser = new User({
			name: name,
			email: email,
			password: hashPassword,
			phone: '',
			dob: '',
			role: 'user',
			id_participant: id_participant,
		})
		await newUser.save()
		await participant.save()
		participant.username_string = email
		participant.password_string = password
		await participant.save()
		return res.status(200).json({ status: 200, message: 'Peserta berhasil didaftarkan' })
	} catch (error) {
		console.error('Error opting in participant:', error)
		return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' })
	}
}

export const addParticipant = async (req, res) => {
	const { name, kelas, id_instansi, jurusan } = req.body
	try {
		const participant = new Participant({
			name: name,
			kelas: kelas,
			id_instansi: id_instansi,
			jurusan: jurusan,
		})
		await participant.save()
		return res
			.status(200)
			.json({ status: 200, message: 'Peserta berhasil ditambahkan', data: participant })
	} catch (error) {
		console.error('Error adding participant:', error)
		return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' })
	}
}
export const deleteParticipant = async (req, res) => {
	const { _id } = req.body
	try {
		const participant = await Participant.findById(_id)
		if (!participant) {
			return res.status(404).json({ status: 404, message: 'Peserta tidak ditemukan' })
		}
		const id_participant = participant._id
		const user = await User.findOne({ id_participant: id_participant })
		if (user) {
			await user.deleteOne()
		}

		//Delete from test session
		await TestSession.deleteMany({ id_participant: id_participant })
		await participant.deleteOne()
		return res.status(200).json({ status: 200, message: 'Peserta berhasil dihapus' })
	} catch (error) {
		console.error('Error deleting participant:', error)
		return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' })
	}
}

export const updateParticipant = async (req, res) => {
	const { _id, name, kelas, id_instansi, jurusan } = req.body
	try {
		const participant = await Participant.findById(_id)
		if (!participant) {
			return res.status(404).json({ status: 404, message: 'Peserta tidak ditemukan' })
		}
		participant.name = name
		participant.kelas = kelas
		participant.id_instansi = id_instansi
		participant.jurusan = jurusan
		await participant.save()
		return res
			.status(200)
			.json({ status: 200, message: 'Peserta berhasil diperbarui', data: participant })
	} catch (error) {
		console.error('Error updating participant:', error)
		return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' })
	}
}

export const getParticipant = async (req, res) => {
	try {
		const { id_instansi, search_key } = req.body
		const participants = await Participant.find({
			id_instansi: id_instansi,
			$or: [
				{ name: { $regex: search_key, $options: 'i' } },
				{ kelas: { $regex: search_key, $options: 'i' } },
				{ jurusan: { $regex: search_key, $options: 'i' } },
			],
		}).sort({ name: 1 })

		if (participants.length === 0) {
			return res.status(404).json({ status: 404, message: 'Peserta tidak ditemukan' })
		}

		const updatedParticipant = await Promise.all(
			participants.map(async parts => {
				const isUser = await User.findOne({ id_participant: parts._id })
				const p = parts.toObject()
				p.isUser = isUser ? true : false
				return p
			}),
		)
		console.log(updatedParticipant)
		return res
			.status(200)
			.json({ status: 200, message: 'Peserta berhasil ditemukan', data: updatedParticipant })
	} catch (error) {
		console.error('Error fetching participants:', error)
		return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' })
	}
}
