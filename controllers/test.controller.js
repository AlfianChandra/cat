import { Test } from '../models/test.model.js'
import { User } from '../models/user.model.js'
import { Instance } from '../models/instance.model.js'
import { Question } from '../models/question.model.js'
import { Participant } from '../models/participant.model.js'
import { Materi } from '../models/materi.model.js'
import { TestSession } from '../models/testSession.model.js'
import moment from 'moment'
import ValidationSession from '../models/validationSession.model.js'
import bcrypt from 'bcrypt'
import QuestionCat from '../models/questionCat.model.js'
import { gradeAnswer } from '../services/answer.js'

export const startValidation = async (req, res) => {
	try {
		const { id } = req.body
		const userId = req.user.id

		const user = await User.findById(userId)
		const idParticipant = user.id_participant

		const exist = await ValidationSession.findOne({
			id_user: userId,
			id_category: id,
			test_status: 'in_progress',
		})
		if (exist) {
			return res.status(200).json({ status: 200, message: 'Validation started', data: exist })
		}
		let data = {}
		data['id_category'] = id
		data['id_participant'] = idParticipant
		data['id_user'] = userId

		const limit = 120
		const startTest = moment().toDate()
		const endTest = moment(startTest).add(limit, 'minutes').toDate()
		const sessionToken = `${Math.random().toString(36).substring(2, 9)}-${Math.random().toString(36).substring(2, 9)}-${Math.random().toString(36).substring(2, 9)}-${Math.random().toString(36).substring(2, 9)}-${Math.random().toString(36).substring(2, 9)}`

		data['start'] = startTest
		data['end'] = endTest
		data['test_status'] = 'in_progress'
		data['test_token'] = sessionToken
		data['state'] = {
			current_question: 1,
			current_level: 1,
		}
		let qMaps = []
		//Get questions
		const questions = await Question.find({ id_category: id })
		let n = 0
		for (const q of questions) {
			n++
			qMaps.push({
				no: n,
				answered: false,
				correct: false,
				id_answer: '',
				id_question: q._id,
			})
		}
		data['question_done'] = qMaps

		const valSession = new ValidationSession(data)
		await valSession.save()

		return res.status(200).json({ status: 200, message: 'Validation started', data: valSession })
	} catch (error) {
		console.error('Error fetching validation questions:', error)
		return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' })
	}
}

export const getSoalData = async (req, res) => {
	try {
		const { id_question } = req.body
		const question = await Question.findById(id_question)
		if (!question) {
			return res.status(404).json({ status: 404, message: 'Soal tidak ditemukan' })
		}

		return res.status(200).json({ status: 200, message: 'ok', data: question })
	} catch (error) {
		console.error('Error fetching soal data:', error)
		return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' })
	}
}

export const updateTestRandomize = async (req, res) => {
	try {
		const { id, randomize } = req.body
		console.log(id, randomize)
		const test = await Test.findById(id)
		if (!test) {
			return res.status(404).json({ status: 404, message: 'Test tidak ditemukan' })
		}

		// Update the randomize field
		test.randomize = randomize
		await test.save()
		return res.status(200).json({ status: 200, message: 'Pengacakan soal berhasil diperbarui' })
	} catch (error) {
		console.error('Error updating test randomize:', error)
		return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' })
	}
}

export const startTest = async (req, res) => {
	try {
		const { id } = req.body
		const userId = req.user.id

		const test = await Test.findById(id)
		if (!test) {
			return res.status(404).json({ status: 404, message: 'Test tidak ditemukan' })
		}

		const user = await User.findById(userId)
		if (!user) {
			return res.status(404).json({ status: 404, message: 'Pengguna tidak ditemukan' })
		}

		const idParticipant = user.id_participant
		const participant = await Participant.findById(idParticipant)
		if (!participant) {
			return res.status(404).json({ status: 404, message: 'Peserta tidak ditemukan' })
		}

		const idInstance = participant.id_instansi
		const testInstances = test.instances
		let isValidInstance = false
		testInstances.forEach(instance => {
			const id = instance._id
			if (id.toString() === idInstance.toString()) {
				isValidInstance = true
			}
		})

		if (!isValidInstance) {
			return res.status(400).json({ status: 400, message: 'Instansi tidak valid untuk test ini' })
		}

		//check if user has already started the test, check using id_user and id_participant
		const existingSession = await TestSession.findOne({
			id_user: user._id,
			id_participant: participant._id,
			id_test: test._id,
		})

		if (existingSession) {
			return res.status(200).json({
				status: 200,
				message: 'Tes sudah dimulai sebelumnya',
				data: { session_token: existingSession.session_token },
			})
		}

		//Block if test is not started for new sessions
		if (test.isStarted === false) {
			return res.status(400).json({ status: 400, message: 'Test belum dimulai' })
		}

		let soalCollection = []
		let n = 1

		for (const soal of test.questions) {
			const idQuestionCat = soal._id.toString()
			const questions = await Question.find({ id_category: idQuestionCat, active: true })
			//const soal number
			const userQuestion = questions.map(q => ({
				id_question: q._id,
				answers: q.answers.map(a => ({ id_answer: a.id_answer, value: a.value })),
				images: q.images,
				id_category: q.id_category,
				soal: q.soalParsed,
				level: n,
				result: {
					isCorrect: false,
					answer: null,
				},
			}))

			//Randomize the order of questions
			if (test.randomize) {
				userQuestion.sort(() => Math.random() - 0.5)
			}

			let qNo = 1
			for (const uQuestion of userQuestion) {
				uQuestion.no = qNo
				qNo++
			}

			soalCollection.push({
				id_questioncat: soal._id,
				name: soal.name,
				questions: userQuestion,
				level: n,
			})
			n++
		}

		let questionsDone = []
		const testTimeLimit = test.timeLimit
		const startTest = moment().toDate()
		const sessionToken = `${Math.random().toString(36).substring(2, 9)}-${Math.random().toString(36).substring(2, 9)}-${Math.random().toString(36).substring(2, 9)}-${Math.random().toString(36).substring(2, 9)}-${Math.random().toString(36).substring(2, 9)}`
		const endTest = moment(startTest).add(testTimeLimit, 'minutes').toDate()

		const longestQuestions = soalCollection.length
			? soalCollection.reduce((max, current) =>
					current.questions.length > max.questions.length ? current : max,
				).questions
			: []

		for (const soal of longestQuestions) {
			questionsDone.push({ no: soal.no, answered: false })
		}

		const testSession = new TestSession({
			id_user: user._id,
			id_participant: participant._id,
			id_test: test._id,
			start: startTest,
			end: endTest,
			payload: soalCollection,
			session_token: sessionToken,
			question_done: questionsDone,
			test_status: 'in_progress',
			state: {
				current_question: 1,
				current_level: 1,
			},
		})

		await testSession.save()
		return res.status(200).json({
			status: 200,
			message: 'ok',
			data: { session_token: sessionToken, start: startTest, end: endTest },
		})
	} catch (error) {
		console.error('Error starting test:', error)
		return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' })
	}
}

export const verifyTestPassword = async (req, res) => {
	try {
		const { id, password } = req.body
		const test = await Test.findById(id)
		if (!test) {
			return res.status(404).json({ status: 404, message: 'Test tidak ditemukan' })
		}

		if (!test.password) {
			return res.status(400).json({ status: 400, message: 'Test tidak memiliki password' })
		}

		const isMatch = await bcrypt.compare(password, test.password)
		if (!isMatch) {
			return res.status(401).json({ status: 401, message: 'Sandi salah', isCorrect: false })
		}
		return res.status(200).json({ status: 200, message: 'Sandi benar', isCorrect: true })
	} catch (error) {
		console.error('Error verifying test password:', error)
		return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' })
	}
}

export const updateTestPassword = async (req, res) => {
	try {
		const { id, password } = req.body
		const test = await Test.findById(id)
		if (!test) {
			return res.status(404).json({ status: 404, message: 'Test tidak ditemukan' })
		}

		if (password.length === 0) {
			test.password = '' // Set password to null if empty
			await test.save()
			return res.status(200).json({ status: 200, message: 'Password test berhasil dihapus' })
		} else {
			const hashedPassword = await bcrypt.hash(password, 10)
			test.password = hashedPassword
			await test.save()
			return res.status(200).json({ status: 200, message: 'Password test berhasil diperbarui' })
		}
	} catch (error) {
		console.error('Error updating test password:', error)
		return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' })
	}
}

export const updateTestTimeLimit = async (req, res) => {
	try {
		const { id, timeLimit } = req.body
		const test = await Test.findById(id)
		if (!test) {
			return res.status(404).json({ status: 404, message: 'Test tidak ditemukan' })
		}

		// Update the test time limit
		test.timeLimit = timeLimit
		await test.save()
		return res.status(200).json({ status: 200, message: 'Batas waktu test berhasil diperbarui' })
	} catch (error) {
		console.error('Error updating test time limit:', error)
		return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' })
	}
}

export const deleteTest = async (req, res) => {
	try {
		const { id } = req.body
		const test = await Test.findById(id)
		if (!test) {
			return res.status(404).json({ status: 404, message: 'Test tidak ditemukan' })
		}
		//Delete test sessions associated with this test
		await TestSession.deleteMany({ id_test: id })
		// Delete the test
		await Test.deleteOne({ _id: id })
		return res.status(200).json({ status: 200, message: 'Test berhasil dihapus' })
	} catch (error) {
		console.error('Error deleting test:', error)
		return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' })
	}
}

export const updateTestDescription = async (req, res) => {
	try {
		const { id, description } = req.body
		const test = await Test.findById(id)
		if (!test) {
			return res.status(404).json({ status: 404, message: 'Test tidak ditemukan' })
		}

		// Update the test description
		test.description = description
		await test.save()
		return res.status(200).json({ status: 200, message: 'Deskripsi test berhasil diperbarui' })
	} catch (error) {
		console.error('Error updating test description:', error)
		return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' })
	}
}

export const updateTestInstance = async (req, res) => {
	try {
		const { id_test, instances } = req.body
		const test = await Test.findById(id_test)
		if (!test) {
			return res.status(404).json({ status: 404, message: 'Test tidak ditemukan' })
		}
		// Update the instances
		test.instances = instances
		await test.save()
		return res.status(200).json({ status: 200, message: 'Instances test berhasil diperbarui' })
	} catch (error) {
		console.error('Error updating test instances:', error)
		return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' })
	}
}

export const updateTestName = async (req, res) => {
	try {
		const { id, name } = req.body
		const test = await Test.findById(id)
		if (!test) {
			return res.status(404).json({ status: 404, message: 'Test tidak ditemukan' })
		}

		// Update the test name
		test.name = name
		await test.save()
		return res.status(200).json({ status: 200, message: 'Nama test berhasil diperbarui' })
	} catch (error) {
		console.error('Error updating test name:', error)
		return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' })
	}
}

export const updateTestSoal = async (req, res) => {
	try {
		const { id_test, questions } = req.body
		const test = await Test.findById(id_test)
		if (!test) {
			return res.status(404).json({ status: 404, message: 'Test tidak ditemukan' })
		}

		// Update the questions
		test.questions = questions
		await test.save()
		return res.status(200).json({ status: 200, message: 'Soal test berhasil diperbarui' })
	} catch (error) {
		console.error('Error updating test soal:', error)
		return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' })
	}
}

export const getTest = async (req, res) => {
	try {
		//Get ever
		const test = await Test.find({})
		if (!test || test.length === 0) {
			return res.status(404).json({ status: 404, message: 'Test tidak ditemukan' })
		}
		return res.status(200).json({ status: 200, data: test })
	} catch (error) {
		console.error('Error fetching test:', error)
		return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' })
	}
}

export const createTest = async (req, res) => {
	try {
		const { name, description, instances, questions, timeLimit } = req.body
		if (!name || !description || !instances || !questions || !timeLimit) {
			return res.status(400).json({ status: 400, message: 'Semua field harus diisi' })
		}

		const newTest = new Test({
			name: name,
			description: description,
			instances: instances,
			questions: questions,
			isStarted: false,
			timeLimit: timeLimit,
		})

		await newTest.save()
		return res.status(200).json({ status: 200, message: 'Test berhasil dibuat' })
	} catch (error) {
		console.error('Error creating test:', error)
		return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' })
	}
}

export const getTestSessionData = async (req, res) => {
	try {
		const { id_user, test_token } = req.body
		const user = await User.findById(id_user)
		if (!user) {
			return res.status(404).json({ status: 404, message: 'Pengguna tidak ditemukan' })
		}
		const idParticipant = user.id_participant
		const participant = await Participant.findById(idParticipant)
		if (!participant) {
			return res.status(404).json({ status: 404, message: 'Peserta tidak ditemukan' })
		}

		const testSession = await TestSession.findOne({
			id_user: user._id,
			id_participant: participant._id,
			session_token: test_token,
		})

		if (!testSession) {
			return res.status(404).json({ status: 404, message: 'Sesi test tidak ditemukan' })
		}

		const idTest = testSession.id_test
		const test = await Test.findById(idTest)
		if (!test) {
			return res.status(404).json({ status: 404, message: 'Test tidak ditemukan' })
		}
		// if (test.isStarted === false) {
		// 	return res
		// 		.status(400)
		// 		.json({ status: 400, message: 'Test belum dimulai', state: 'not_started' })
		// }

		const data = {
			question_map: testSession.question_done,
			start_time: testSession.start,
			end_time: testSession.end,
			test_status: testSession.test_status,
		}

		return res.status(200).json({ status: 200, message: 'ok', data: data })
	} catch (error) {
		console.error('Error fetching test session data:', error)
		return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' })
	}
}

export const getCurrentSession = async (req, res) => {
	try {
		const { test_token } = req.body
		const testSession = await TestSession.findOne({ session_token: test_token })
		if (!testSession) {
			return res.status(404).json({ status: 404, message: 'Sesi test tidak ditemukan' })
		}

		const state = testSession.state
		return res.status(200).json({ status: 200, message: 'ok', data: state })
	} catch (error) {
		console.error('Error fetching current session:', error)
		return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' })
	}
}

export const getQuestion = async (req, res) => {
	try {
		const { test_token, current_question, current_level } = req.body
		const testSession = await TestSession.findOne({ session_token: test_token })
		if (!testSession) {
			return res.status(404).json({ status: 404, message: 'Sesi test tidak ditemukan' })
		}

		const payload = testSession.payload
		const questionPack = payload.find(pack => pack.level === current_level)
		if (!questionPack) {
			return res.status(404).json({ status: 404, message: 'Level soal tidak ditemukan' })
		}

		const question = questionPack.questions.find(q => q.no === current_question)
		if (!question) {
			return res.status(404).json({ status: 404, message: 'Soal tidak ditemukan' })
		}

		return res.status(200).json({ status: 200, message: 'ok', data: question })
	} catch (error) {
		console.error('Error fetching question:', error)
		return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' })
	}
}

export const answerQuestion = async (req, res) => {
	try {
		const {
			test_token,
			id_question,
			answer,
			time_taken,
			current_question,
			current_level,
			answer_reason,
		} = req.body

		const testSession = await TestSession.findOne({ session_token: test_token })
		if (!testSession) {
			return res.status(404).json({ status: 404, message: 'Sesi test tidak ditemukan' })
		}

		const endTime = testSession.end
		if (moment().isAfter(endTime)) {
			testSession.test_status = 'completed'
			await testSession.save()
			return res.status(400).json({ status: 400, message: 'Waktu test sudah berakhir' })
		}

		const question = await Question.findById(id_question)

		const idAnswer = answer.id_answer
		const answerValue = answer.value
		const correctAnswer = question.answers.find(a => a.is_correct)
		const correctIdAnswer = correctAnswer.id_answer
		const isCorrect = idAnswer === correctIdAnswer

		const pack = testSession.payload.find(p => p.level === current_level).questions
		const questionInPack = pack.find(qp => qp.no === current_question)

		//Update result
		questionInPack.result = { isCorrect, answer: answerValue, time_taken }
		testSession.markModified('payload')

		//Update question done
		const qDoneIndex = testSession.question_done.findIndex(qd => qd.no === current_question)
		if (qDoneIndex !== -1) {
			testSession.question_done[qDoneIndex].answered = true
			testSession.question_done[qDoneIndex].time_taken = time_taken || null
			testSession.question_done[qDoneIndex].question_data = {
				id_question: id_question,
				id_question_cat: question.id_category,
			}
			testSession.question_done[qDoneIndex].isCorrect = isCorrect
			testSession.question_done[qDoneIndex].answer = answerValue
			testSession.question_done[qDoneIndex].correct_answer = correctAnswer.value
			testSession.question_done[qDoneIndex].level = current_level || null
			testSession.question_done[qDoneIndex].answer_reason = answer_reason || null
		}

		testSession.markModified('question_done')
		await testSession.save()

		// 10. Tentukan level selanjutnya berdasarkan logic yang baru
		const idTest = testSession.id_test
		const test = await Test.findById(idTest)
		const levelCount = test.questions.length
		const soalCount = testSession.question_done.length
		const nextQuestion = current_question + 1

		const hasQuestion = (level, questionNo) => {
			return testSession.payload.some(
				p => p.level === level && p.questions.some(q => q.no === questionNo),
			)
		}

		// Helper untuk mencari level berikutnya dengan soal
		const findLevelWithQuestion = (start, step) => {
			let lvl = start
			while (lvl >= 1 && lvl <= levelCount) {
				if (hasQuestion(lvl, nextQuestion)) return lvl
				lvl += step
			}
			return null
		}

		let nextLevel = current_level

		if (current_level === 1) {
			if (isCorrect) {
				const lvl = findLevelWithQuestion(current_level + 1, 1)
				if (lvl) nextLevel = lvl
			} else {
				if (!hasQuestion(current_level, nextQuestion)) {
					const lvl = findLevelWithQuestion(current_level + 1, 1)
					if (lvl) nextLevel = lvl
				}
			}
		} else if (current_level === levelCount) {
			if (isCorrect) {
				if (!hasQuestion(current_level, nextQuestion)) {
					const lvl = findLevelWithQuestion(current_level - 1, -1)
					if (lvl) nextLevel = lvl
				}
			} else {
				let lvl = findLevelWithQuestion(current_level - 1, -1)
				if (lvl !== null) {
					nextLevel = lvl
				} else {
					lvl = findLevelWithQuestion(1, 1)
					if (lvl !== null) nextLevel = lvl
				}
			}
		} else {
			if (isCorrect) {
				const lvl = findLevelWithQuestion(current_level + 1, 1)
				if (lvl) nextLevel = lvl
			} else {
				let lvl = findLevelWithQuestion(current_level - 1, -1)
				if (lvl !== null) {
					nextLevel = lvl
				} else {
					lvl = findLevelWithQuestion(current_level + 1, 1)
					if (lvl !== null) nextLevel = lvl
				}
			}
		}

		let response = {
			current_level: nextLevel,
			current_question: current_question,
			isEnded: false,
		}

		// 11. Cek apakah masih ada soal selanjutnya
		if (nextQuestion <= soalCount) {
			response['current_question'] = nextQuestion
		} else {
			response['isEnded'] = true
			testSession.test_status = 'completed'
		}

		// 12. Update state di test session
		testSession.state.current_question = response.current_question
		testSession.state.current_level = response.current_level
		testSession.markModified('state')
		await testSession.save()

		return res.status(200).json({
			status: 200,
			message: 'Jawaban berhasil disimpan',
			data: response,
		})
	} catch (err) {
		console.error('Error answering question:', err)
	}
}

export const answerQuestion1 = async (req, res) => {
	try {
		const {
			test_token,
			id_question,
			answer,
			time_taken,
			current_question,
			current_level,
			answer_reason,
		} = req.body

		// 1. Find test session
		const testSession = await TestSession.findOne({ session_token: test_token })
		if (!testSession) {
			return res.status(404).json({ status: 404, message: 'Sesi test tidak ditemukan' })
		}

		const endTime = testSession.end
		if (moment().isAfter(endTime)) {
			testSession.test_status = 'completed'
			await testSession.save()
			return res.status(400).json({ status: 400, message: 'Waktu test sudah berakhir' })
		}

		const question = await Question.findById(id_question)
		if (!question) {
			return res.status(404).json({ status: 404, message: 'Soal tidak ditemukan' })
		}

		// 3. Cocokkan jawaban user dengan jawaban benar dari database
		const normalizedAnswer = typeof answer === 'object' ? answer : { value: answer }
		const { isCorrect, chosenLabels, correctLabels } = gradeAnswer(question, normalizedAnswer)

		// 4. Ambil questionPack dari current_level
		const payload = testSession.payload
		const questionPack = payload.find(pack => pack.level === current_level)
		if (!questionPack) {
			return res.status(404).json({ status: 404, message: 'Level soal tidak ditemukan' })
		}

		// 5. Cari question yang sedang dijawab
		const questionToUpdate = questionPack.questions.find(q => q.no === current_question)
		if (!questionToUpdate) {
			return res.status(404).json({ status: 404, message: 'Soal tidak ditemukan di dalam level' })
		}

		const idUser = testSession.id_user.toString()
		const user = await User.findById(idUser)
		if (!user) {
			return res.status(404).json({ status: 404, message: 'Pengguna tidak ditemukan' })
		}

		const idParticipant = user.id_participant
		if (idParticipant == null) {
			return res.status(404).json({ status: 404, message: 'Peserta tidak ditemukan' })
		}

		const participant = await Participant.findById(idParticipant)
		if (!participant) {
			return res.status(404).json({ status: 404, message: 'Peserta tidak ditemukan' })
		}

		const idInstance = participant.id_instansi

		// 6. Update hasil jawaban
		questionToUpdate.result = {
			isCorrect,
			answer: chosenLabels.length > 1 ? chosenLabels : chosenLabels[0] || null,
			correct_answer: correctLabels.length > 1 ? correctLabels : correctLabels[0] || null,
			time_taken: time_taken || null,
		}
		testSession.markModified('payload')

		// 7. Update daftar soal yang udah dijawab
		const questionIndex = testSession.question_done.findIndex(q => q.no === current_question)
		if (questionIndex !== -1) {
			testSession.question_done[questionIndex].answered = true
			testSession.question_done[questionIndex].time_taken = time_taken || null
			testSession.question_done[questionIndex].question_data = {
				id_question: id_question,
				id_question_cat: questionPack.id_questioncat,
			}

			testSession.question_done[questionIndex].participant_data = {
				id_participant: idParticipant.toString(),
				id_instance: idInstance.toString(),
			}
			testSession.question_done[questionIndex].isCorrect = isCorrect
			testSession.question_done[questionIndex].answer =
				chosenLabels.length > 1 ? chosenLabels : chosenLabels[0] || null
			testSession.question_done[questionIndex].correct_answer =
				correctLabels.length > 1 ? correctLabels : correctLabels[0] || null
			testSession.question_done[questionIndex].level = current_level || null
			testSession.question_done[questionIndex].answer_reason = answer_reason || null
		}

		testSession.markModified('question_done')

		// 8. Save perubahan sebelum menentukan level selanjutnya
		await testSession.save()

		// 9. Helper function untuk cek apakah soal ada di level dan nomor tertentu
		const hasQuestion = (level, questionNo) => {
			return testSession.payload.some(
				p => p.level === level && p.questions.some(q => q.no === questionNo),
			)
		}

		// Helper untuk mencari level berikutnya dengan soal
		const findLevelWithQuestion = (start, step) => {
			let lvl = start
			while (lvl >= 1 && lvl <= levelCount) {
				if (hasQuestion(lvl, nextQuestion)) return lvl
				lvl += step
			}
			return null
		}

		// 10. Tentukan level selanjutnya berdasarkan logic yang baru
		const idTest = testSession.id_test
		const test = await Test.findById(idTest)
		const levelCount = test.questions.length
		const soalCount = testSession.question_done.length
		const nextQuestion = current_question + 1

		let nextLevel = current_level

		if (current_level === 1) {
			if (isCorrect) {
				const lvl = findLevelWithQuestion(current_level + 1, 1)
				if (lvl) nextLevel = lvl
			} else {
				if (!hasQuestion(current_level, nextQuestion)) {
					const lvl = findLevelWithQuestion(current_level + 1, 1)
					if (lvl) nextLevel = lvl
				}
			}
		} else if (current_level === levelCount) {
			if (isCorrect) {
				if (!hasQuestion(current_level, nextQuestion)) {
					const lvl = findLevelWithQuestion(current_level - 1, -1)
					if (lvl) nextLevel = lvl
				}
			} else {
				let lvl = findLevelWithQuestion(current_level - 1, -1)
				if (lvl !== null) {
					nextLevel = lvl
				} else {
					lvl = findLevelWithQuestion(1, 1)
					if (lvl !== null) nextLevel = lvl
				}
			}
		} else {
			if (isCorrect) {
				const lvl = findLevelWithQuestion(current_level + 1, 1)
				if (lvl) nextLevel = lvl
			} else {
				let lvl = findLevelWithQuestion(current_level - 1, -1)
				if (lvl !== null) {
					nextLevel = lvl
				} else {
					lvl = findLevelWithQuestion(current_level + 1, 1)
					if (lvl !== null) nextLevel = lvl
				}
			}
		}

		let response = {
			current_level: nextLevel,
			current_question: current_question,
			isEnded: false,
		}

		// 11. Cek apakah masih ada soal selanjutnya
		if (nextQuestion <= soalCount) {
			response['current_question'] = nextQuestion
		} else {
			response['isEnded'] = true
			testSession.test_status = 'completed'
		}

		// 12. Update state di test session
		testSession.state.current_question = response.current_question
		testSession.state.current_level = response.current_level
		testSession.markModified('state')
		await testSession.save()

		return res.status(200).json({
			status: 200,
			message: 'Jawaban berhasil disimpan',
			data: response,
		})
	} catch (error) {
		console.error('Error answering question:', error)
		return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' })
	}
}

export const getUserTestSessions = async (req, res) => {
	try {
		const { id_test, id_instance } = req.body
		const participants = await Participant.find({ id_instansi: id_instance })
		if (participants.length === 0) {
			return res
				.status(404)
				.json({ status: 404, message: 'Peserta tidak ditemukan untuk instansi ini' })
		}

		let userSessions = []
		for (const part of participants) {
			let testSessions = await TestSession.find({
				id_test: id_test,
				id_participant: part._id.toString(),
			})

			//get user without password
			const user = await User.findOne({ id_participant: part._id.toString() }).select('-password')

			const materi = await Materi.find()
			const allQuestions = await Question.find()
			testSessions = testSessions.map(session => ({
				id: session._id,
				id_user: session.id_user.toString(),
				id_participant: session.id_participant.toString(),
				id_test: session.id_test.toString(),
				start: session.start,
				end: session.end,
				session_token: session.session_token,
				question: {
					payload: session.payload, //array of question categories
					categories: session.payload.map(p => ({
						id_questioncat: p.id_questioncat,
						name: p.name,
					})),
				},
				question_done: session.question_done.map(qd => {
					return {
						no: qd.no,
						answered: qd.answered,
						time_taken: qd.time_taken,
						question_data: qd.question_data,
						participant_data: qd.participant_data,
						isCorrect: qd.isCorrect,
						answer: qd.answer,
						materi: materi.find(
							m =>
								m._id.toString() ===
								allQuestions
									.find(aq => aq._id.toString() === qd.question_data?.id_question)
									?.id_materi.toString(),
						),
						correct_answer: qd.correct_answer,
						level: qd.level,
						answer_reason: qd.answer_reason,
					}
				}),
				test_status: session.test_status,
				state: session.state,
				participant_data: {
					id_participant: part._id.toString(),
					id_instance: part.id_instansi.toString(),
					id_user: session.id_user.toString(),
					meta: part,
					profile: user,
				},
			}))
			userSessions.push(...testSessions)
		}

		console.log(userSessions)

		//Sort a to z by start time
		userSessions.sort((a, b) => new Date(a.start) - new Date(b.start))
		if (userSessions.length === 0) {
			return res.status(404).json({ status: 404, message: 'Tidak ada sesi test ditemukan' })
		}
		return res.status(200).json({ status: 200, message: 'ok', data: userSessions })
	} catch (error) {
		console.error('Error fetching user test sessions:', error)
		return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' })
	}
}

export const getTestReport = async (req, res) => {
	try {
		const { id_test } = req.body

		const testSessions = await TestSession.find({ id_test }).lean()
		if (!testSessions.length) {
			return res
				.status(404)
				.json({ status: 404, message: 'Tidak ada sesi test ditemukan untuk test ini' })
		}

		const test = await Test.findById(id_test).lean()
		if (!test) {
			return res.status(404).json({ status: 404, message: 'Test tidak ditemukan' })
		}
		const instances = test.instances || []

		const instIds = instances.map(inst => inst._id.toString())
		const allParticipants = await Participant.find({ id_instansi: { $in: instIds } })
			.select('-password_string -username_string')
			.lean()
		const participantIds = [...new Set(allParticipants.map(p => p._id.toString()))]

		const sessionMap = {}
		for (const sess of testSessions) {
			const pid = sess.id_participant.toString()
			if (!sessionMap[pid]) sessionMap[pid] = []
			sessionMap[pid].push(sess)
		}

		const partTestSession = []
		for (const pid of participantIds) {
			if (sessionMap[pid]) {
				partTestSession.push(...sessionMap[pid])
			}
		}

		if (!partTestSession.length) {
			return res
				.status(404)
				.json({ status: 404, message: 'Tidak ada sesi test ditemukan untuk peserta ini' })
		}

		const categories = partTestSession[0].payload || []
		if (!categories.length) {
			return res.status(404).json({ status: 404, message: 'Tidak ada kategori soal ditemukan' })
		}

		let result = {}
		for (const cat of categories) {
			const name = cat.name || `Level ${cat.level}`
			result[name] = {
				correct: 0,
				incorrect: 0,
				indicator_name: name,
			}
		}

		let partProfile = []
		const participantMap = {}
		for (const p of allParticipants) {
			participantMap[p._id.toString()] = p
		}

		for (const sess of partTestSession) {
			const cats = sess.payload || []
			const questionDone = sess.question_done || []

			for (const q of questionDone) {
				const level = q.level
				const name = cats.find(cat => cat.level === level)?.name || `Level ${level}`
				if (!result[name]) {
					result[name] = {
						correct: q.isCorrect ? 1 : 0,
						incorrect: !q.isCorrect && q.answer !== null ? 1 : 0,
						indicator_name: name,
					}
				} else {
					if (q.isCorrect) {
						result[name].correct++
					} else if (q.answer !== null) {
						result[name].incorrect++
					}
				}
			}

			const partId = sess.id_participant.toString()
			const participant = participantMap[partId]
			if (participant) {
				const instance = instances.find(
					i => i._id.toString() === participant.id_instansi.toString(),
				)
				partProfile.push({
					profile_data: participant,
					profile_instance: instance || null,
				})
			}
		}

		const sessionByParticipant = new Map()
		for (const sess of testSessions) {
			sessionByParticipant.set(sess.id_participant.toString(), sess)
		}

		const instanceResults = {}

		for (const inst of instances) {
			const instanceName = inst.name
			instanceResults[instanceName] = {
				data: {},
				participants: [],
				instance_data: inst,
			}

			const instId = inst._id.toString()
			const instParticipants = allParticipants.filter(p => p.id_instansi.toString() === instId)
			for (const p of instParticipants) {
				const partId = p._id.toString()
				const session = sessionByParticipant.get(partId)
				if (!session) continue

				const cats = session.payload || []
				instanceResults[instanceName].participants.push(
					allParticipants.find(part => part._id.toString() === partId) || null,
				)
				for (const cat of cats) {
					const name = cat.name || `Level ${cat.level}`
					if (!instanceResults[instanceName].data[name]) {
						instanceResults[instanceName].data[name] = {
							correct: 0,
							incorrect: 0,
							indicator_name: name,
						}
					}
				}

				for (const q of session.question_done || []) {
					const level = q.level
					const name = cats.find(cat => cat.level === level)?.name || `Level ${level}`
					if (!instanceResults[instanceName].data[name]) {
						instanceResults[instanceName].data[name] = {
							correct: 0,
							incorrect: 0,
							indicator_name: name,
						}
					}
					if (q.isCorrect) {
						instanceResults[instanceName].data[name].correct++
					} else if (q.answer !== null) {
						instanceResults[instanceName].data[name].incorrect++
					}
				}
			}
		}

		//Get results by materi
		const mMateries = await Materi.find()
		const mQuestions = await Question.find()
		let mMateriesQResult = []

		for (const mtr of mMateries) {
			const mIdMateri = mtr._id.toString()
			const mQuestionMateri = mQuestions.filter(q => q.id_materi.toString() === mIdMateri)
			mMateriesQResult.push({
				id_materi: mIdMateri,
				materi_data: mtr,
				questions: mQuestionMateri,
			})
		}

		const responseData = {
			participants: partProfile,
			instances: instances,
			result: result,
			instanceResults: [],
		}

		Object.keys(instanceResults).forEach(instName => {
			responseData.instanceResults.push(instanceResults[instName])
		})
		return res.status(200).json({ status: 200, message: 'ok', data: responseData })
	} catch (err) {
		console.error('Error fetching test report:', err)
		return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' })
	}
}

export const getMateriScores = async (req, res) => {
	try {
		const { id_test } = req.body

		const testSessions = await TestSession.find({ id_test }).lean()
		if (!testSessions.length) {
			return res
				.status(404)
				.json({ status: 404, message: 'Tidak ada sesi test ditemukan untuk test ini' })
		}

		const questions = await Question.find().select('_id id_materi').lean()
		const questionToMateri = {}
		questions.forEach(q => {
			questionToMateri[q._id.toString()] = q.id_materi?.toString()
		})

		const materies = await Materi.find().select('_id name').lean()
		const materiMap = {}
		materies.forEach(m => {
			materiMap[m._id.toString()] = m.name
		})

		const scoreMap = {}
		for (const sess of testSessions) {
			for (const q of sess.question_done || []) {
				const qId = q.question_data?.id_question?.toString()
				const mId = questionToMateri[qId]
				if (!mId) continue

				if (!scoreMap[mId]) {
					scoreMap[mId] = {
						materi: materiMap[mId] || 'Unknown',
						correct: 0,
						incorrect: 0,
					}
				}

				if (q.isCorrect) {
					scoreMap[mId].correct++
				} else if (q.answered) {
					scoreMap[mId].incorrect++
				}
			}
		}

		const scoreArr = Object.values(scoreMap)
		return res.status(200).json({ status: 200, message: 'ok', data: { score: scoreArr } })
	} catch (error) {
		console.error('Error fetching materi scores:', error)
		return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' })
	}
}

// export const getParticipantsByInstance = async (req, res) => {
// 	try {
// 		const { id_test, id_instance } = req.body
// 		const test = await Test.findById(id_test)
// 		const levels = test.questions.length
// 		const instance = test.instances.find(i => String(i._id) === String(id_instance))
// 		const participants = await Participant.find({ id_instansi: id_instance })

// 		let sessions = []
// 		for (const part of participants) {
// 			const userSessions = await TestSession.find({
// 				id_test,
// 				id_participant: part._id,
// 				test_status: 'completed',
// 			})
// 			sessions.push(...userSessions)
// 		}

// 		const levelMap = []
// 		const scoreMap = {}
// 		for (let i = 0; i < levels; i++) {
// 			levelMap.push(test.questions[i].name)
// 			scoreMap[test.questions[i].name] = {
// 				correct: 0,
// 				incorrect: 0,
// 				indicator_name: test.questions[i].name,
// 				level: i + 1,
// 			}
// 		}

// 		return res.status(200).json({ status: 200, message: 'ok', data: { levelMap, scoreMap } })
// 	} catch (err) {
// 		console.error('Error getParticipantsByInstance:', err)
// 	}
// }

export const getParticipantsByInstance = async (req, res) => {
	try {
		const { id_test, id_instance, status } = req.body

		// 1) Validasi test & instance
		const test = await Test.findById(id_test).lean()
		if (!test) {
			return res.status(404).json({ status: 404, message: 'Test tidak ditemukan' })
		}

		const instance = (test.instances || []).find(i => String(i._id) === String(id_instance))
		if (!instance) {
			return res
				.status(404)
				.json({ status: 404, message: 'Instansi tidak ditemukan dalam test ini' })
		}

		// 2) Ambil peserta instansi ini
		const participants = await Participant.find({ id_instansi: id_instance })
			.select('-password_string -username_string')
			.lean()

		if (!participants.length) {
			return res.status(200).json({
				status: 200,
				message: 'ok',
				data: { data: [], total: {}, result: {} },
			})
		}

		const participantMap = new Map(participants.map(p => [String(p._id), p]))

		// 3) Ambil sesi user
		const sessionFilter = {
			id_test,
			id_participant: { $in: participants.map(p => p._id) },
			test_status: status || 'completed',
		}

		// pakai field start, bukan start_date
		const userSessions = await TestSession.find(sessionFilter).sort({ start: 1 }).lean()

		if (!userSessions.length) {
			return res.status(200).json({
				status: 200,
				message: 'ok',
				data: { data: [], total: {}, result: {} },
			})
		}

		const response = []
		const total = {}
		const result = {}

		for (const sess of userSessions) {
			const answers = {}
			for (const pack of sess.payload || []) {
				const name = pack?.name || (pack?.level != null ? `Level ${pack.level}` : 'Tanpa Kategori')
				answers[name] = { correct: 0, incorrect: 0, indicator_name: name }
			}

			// Hitung benar/salah cuma dari question_done.isCorrect
			for (const q of sess.question_done || []) {
				const name = (sess.payload || []).find(p => p.level === q.level)?.name || `Level ${q.level}`
				if (!answers[name]) {
					answers[name] = { correct: 0, incorrect: 0, indicator_name: name }
				}
				if (q.isCorrect === true) answers[name].correct += 1
				if (q.isCorrect === false) answers[name].incorrect += 1
			}

			// Report per peserta
			const pData = participantMap.get(String(sess.id_participant)) || null
			const report = {
				Nama: pData?.name || '-',
				Status: sess.test_status === 'completed' ? 'Selesai' : 'Sedang Berlangsung',
			}

			for (const [cat, v] of Object.entries(answers)) {
				report[`${cat} - Benar`] = v.correct
				report[`${cat} - Salah`] = v.incorrect
			}

			// Total dan result agregat
			for (const [cat, v] of Object.entries(answers)) {
				if (!total[cat]) total[cat] = { correct: 0, incorrect: 0, indicator_name: cat }
				if (!result[cat]) result[cat] = { correct: 0, incorrect: 0, indicator_name: cat }
				total[cat].correct += v.correct
				total[cat].incorrect += v.incorrect
				result[cat].correct += v.correct
				result[cat].incorrect += v.incorrect
			}

			response.push({
				participant_data: pData,
				session_data: { ...sess, test_name: sess.test_name || test.name },
				answers_data: answers,
				report,
			})
		}

		return res.status(200).json({
			status: 200,
			message: 'ok',
			data: { data: response, total, result },
		})
	} catch (error) {
		console.error('Error getParticipantsByInstance:', error)
		return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' })
	}
}

// export const getParticipantsByInstance = async (req, res) => {
// 	try {
// 		const { id_test, id_instance, status } = req.body

// 		// Validasi test
// 		const test = await Test.findById(id_test)
// 		if (!test) {
// 			return res.status(404).json({ status: 404, message: 'Test tidak ditemukan' })
// 		}

// 		// Validasi instance
// 		const instance = test.instances.find(inst => inst._id.toString() === id_instance)
// 		if (!instance) {
// 			return res
// 				.status(404)
// 				.json({ status: 404, message: 'Instansi tidak ditemukan dalam test ini' })
// 		}

// 		// Ambil participants
// 		const participants = await Participant.find({ id_instansi: id_instance })
// 			.select('-password_string -username_string')
// 			.lean()

// 		if (participants.length === 0) {
// 			return res.status(404).json({ status: 404, message: 'Tidak ada peserta ditemukan' })
// 		}

// 		// Ambil user sessions dengan filter status
// 		const sessionQuery = {
// 			id_test,
// 			id_participant: { $in: participants.map(p => p._id) },
// 		}

// 		if (status) {
// 			sessionQuery.test_status = status
// 		}

// 		const userSessions = await TestSession.find(sessionQuery).sort({ start: 1 })

// 		if (userSessions.length === 0) {
// 			return res.status(404).json({ status: 404, message: 'Tidak ada sesi test ditemukan' })
// 		}

// 		// Proses data response
// 		const firstSession = userSessions[0]
// 		const levelStructure = {}

// 		if (firstSession && firstSession.payload) {
// 			firstSession.payload.forEach(item => {
// 				const levelName = item.name || `Level ${item.level}`
// 				levelStructure[levelName] = { correct: 0, incorrect: 0 }
// 			})
// 		}

// 		const sessionMaps = new Map()
// 		let response = []
// 		for (const sess of userSessions) {
// 			const idParticipant = sess.id_participant.toString()
// 			const participantData = participants.find(p => p._id.toString() === idParticipant)
// 			let sessionData = {}
// 			sessionData.session_data = sess
// 			if (participantData) {
// 				sessionData.participant_data = participantData
// 			}
// 			let answers = {}
// 			let questionLevelMap = {}
// 			// initialize answer counters per level name and map questions to their level
// 			sess.payload.forEach(item => {
// 				const levelName = item.name || `Level ${item.level}`
// 				answers[levelName] = {
// 					correct: 0,
// 					incorrect: 0,
// 				}
// 				;(item.questions || []).forEach(q => {
// 					if (q.no != null) questionLevelMap[String(q.no)] = levelName
// 					if (q.id_question) questionLevelMap[String(q.id_question)] = levelName
// 					if (q.question_data?.id_question)
// 						questionLevelMap[String(q.question_data.id_question)] = levelName
// 				})
// 			})

// 			// tally correct and incorrect answers from question_done
// 			sess.question_done.forEach(q => {
// 				const levelName =
// 					questionLevelMap[String(q.no)] ||
// 					questionLevelMap[String(q.id_question)] ||
// 					questionLevelMap[String(q.question_data?.id_question)]
// 				if (!answers[levelName]) return
// 				if (q.isCorrect === true) {
// 					answers[levelName].correct += 1
// 				} else if (q.isCorrect === false) {
// 					answers[levelName].incorrect += 1
// 				}
// 			})

// 			sessionMaps.set(sess._id.toString(), questionLevelMap)

// 			sessionData.answers_data = answers
// 			sessionData.report = {
// 				Nama: participantData?.name,
// 				Status: sess.test_status == 'completed' ? 'Selesai' : 'Sedang Berlangsung',
// 			}

// 			Object.keys(sessionData.answers_data).forEach(levelName => {
// 				sessionData.report[levelName + ' - Benar'] =
// 					sessionData.answers_data[levelName].correct || 0
// 				sessionData.report[levelName + ' - Salah'] =
// 					sessionData.answers_data[levelName].incorrect || 0
// 			})
// 			response.push(sessionData)
// 		}

// 		let total = {}
// 		userSessions.forEach(sess => {
// 			sess.payload.forEach(item => {
// 				const levelName = item.name || `Level ${item.level}`
// 				if (!total[levelName]) {
// 					total[levelName] = { correct: 0, incorrect: 0 }
// 				}
// 			})
// 		})

// 		response.forEach(sess => {
// 			Object.keys(sess.answers_data).forEach(levelName => {
// 				if (total[levelName]) {
// 					total[levelName].correct += sess.answers_data[levelName].correct || 0
// 					total[levelName].incorrect += sess.answers_data[levelName].incorrect || 0
// 				}
// 			})
// 		})

// 		let result = {}
// 		const categories = userSessions[0]?.payload || []
// 		for (const cat of categories) {
// 			const name = cat.name || `Level ${cat.level}`
// 			result[name] = { correct: 0, incorrect: 0, indicator_name: name }
// 		}
// 		for (const sess of userSessions) {
// 			const map = sessionMaps.get(sess._id.toString()) || {}
// 			for (const q of sess.question_done || []) {
// 				const levelName =
// 					map[String(q.no)] ||
// 					map[String(q.id_question)] ||
// 					map[String(q.question_data?.id_question)]
// 				if (!levelName) continue
// 				if (!result[levelName]) {
// 					result[levelName] = { correct: 0, incorrect: 0, indicator_name: levelName }
// 				}
// 				if (q.isCorrect === true) {
// 					result[levelName].correct++
// 				} else if (q.isCorrect === false) {
// 					result[levelName].incorrect++
// 				}
// 			}
// 		}

// 		const finalResponse = {
// 			data: response,
// 			total: total,
// 			result: result,
// 		}

// 		return res.status(200).json({
// 			status: 200,
// 			message: 'ok',
// 			data: finalResponse,
// 		})
// 	} catch (error) {
// 		console.error('Error fetching participants by instance:', error)
// 		return res.status(500).json({
// 			status: 500,
// 			message: 'Terjadi kesalahan server',
// 			error: process.env.NODE_ENV === 'development' ? error.message : undefined,
// 		})
// 	}
// }

export const setAsCompleted = async (req, res) => {
	try {
		const { test_token } = req.body
		const testSession = await TestSession.findOne({ session_token: test_token })
		if (!testSession) {
			return res.status(404).json({ status: 404, message: 'Sesi test tidak ditemukan' })
		}

		const end = testSession.end
		const currentTime = moment().toDate()
		if (currentTime < end) {
			return res.status(400).json({ status: 400, message: 'Waktu test tidak valid' })
		}

		if (testSession.test_status === 'completed') {
			return res.status(400).json({ status: 400, message: 'Sesi test sudah selesai' })
		}

		testSession.test_status = 'completed'
		await testSession.save()
		return res
			.status(200)
			.json({ status: 200, message: 'Sesi test berhasil ditandai sebagai selesai' })
	} catch (error) {
		console.error('Error setting test as completed:', error)
		return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' })
	}
}

export const updateTestAccess = async (req, res) => {
	try {
		const { id, isStarted } = req.body
		const test = await Test.findById(id)
		if (!test) {
			return res.status(404).json({ status: 404, message: 'Test tidak ditemukan' })
		}
		// Update the test access
		test.isStarted = isStarted
		await test.save()
		return res.status(200).json({ status: 200, message: 'Akses test berhasil diperbarui' })
	} catch (error) {
		console.error('Error updating test access:', error)
		return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' })
	}
}

export const getUserSessions = async (req, res) => {
	try {
		const userId = req.user.id
		const user = await User.findById(userId)
		if (!user) {
			return res.status(404).json({ status: 404, message: 'Pengguna tidak ditemukan' })
		}

		const sessions = await TestSession.find({ id_user: user._id }).sort({ start: -1 }).lean()
		if (!sessions || sessions.length === 0) {
			return res.status(404).json({ status: 404, message: 'Tidak ada sesi test ditemukan' })
		}

		let results = []
		const test = await Test.find()
		for (const ses of sessions) {
			const result = {}
			result.test = test.find(t => t._id.toString() === ses.id_test.toString())
			result.session = {
				start: ses.start,
				end: ses.end,
				session_token: ses.session_token,
				test_status: ses.test_status,
				state: ses.state,
				id_test: ses.id_test.toString(),
				id_participant: ses.id_participant.toString(),
				id_user: ses.id_user.toString(),
			}
			results.push(result)
		}

		return res.status(200).json({ status: 200, message: 'ok', data: results })
	} catch (error) {
		console.error('Error fetching user sessions:', error)
		return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' })
	}
}

export const fixParticipantAnswers = async (req, res) => {
	try {
		const sessions = await TestSession.find()
		const cache = new Map()
		let updatedCount = 0

		for (const session of sessions) {
			let sessionUpdated = false

			for (const pack of session.payload || []) {
				for (const q of pack.questions || []) {
					const answerValue = q?.result?.answer != null ? String(q.result.answer) : ''

					let question = cache.get(q.id_question)
					if (!question) {
						question = await Question.findById(q.id_question).lean()
						if (question) cache.set(q.id_question, question)
					}
					if (!question) continue

					const found = (question.answers || []).find(a => String(a?.value) === answerValue)
					const isCorrect = found ? Boolean(found.is_correct) : false
					const correctLabels = (question.answers || [])
						.filter(a => Boolean(a?.is_correct))
						.map(a => String(a.value))
					const correctAnswer = correctLabels.length > 1 ? correctLabels : correctLabels[0] || null

					if (q.result.isCorrect !== isCorrect) {
						q.result.isCorrect = isCorrect
						sessionUpdated = true
					}
					if (q.result.correct_answer !== correctAnswer) {
						q.result.correct_answer = correctAnswer
						sessionUpdated = true
					}

					const done = session.question_done?.find(d => {
						return d.question_data?.id_question === q.id_question || d.no === q.no
					})
					if (done) {
						if (done.isCorrect !== isCorrect) {
							done.isCorrect = isCorrect
							sessionUpdated = true
						}
						if (done.answer !== q.result.answer) {
							done.answer = q.result.answer
							sessionUpdated = true
						}
						if (done.correct_answer !== correctAnswer) {
							done.correct_answer = correctAnswer
							sessionUpdated = true
						}
					}
				}
			}

			if (sessionUpdated) {
				session.markModified('payload')
				session.markModified('question_done')
				await session.save()
				updatedCount++
			}
		}

		return res
			.status(200)
			.json({ status: 200, message: 'Jawaban peserta berhasil diperbarui', updated: updatedCount })
	} catch (error) {
		console.error('Error fixing participant answers:', error)
		return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' })
	}
}

export const getSescatDetail = async (req, res) => {
	try {
		const { id_session } = req.body
		const ses = await TestSession.findById(id_session)
		if (!ses) {
			return res.status(404).json({ status: 404, message: 'Sesi tidak ditemukan' })
		}

		const payload = ses.payload
		const idcats = payload.map(p => p.id_questioncat)

		if (idcats.length === 0) {
			return res.status(404).json({ status: 404, message: 'Kategori tidak ditemukan' })
		}

		let catDetailsData = []
		for (const x of idcats) {
			const catData = await QuestionCat.findById(x)
			catDetailsData.push(catData)
		}

		return res.status(200).json({ status: 200, payload: catDetailsData })
	} catch (err) {
		console.error('Error fetching sesi cat detail:', err)
		return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' })
	}
}

export const fcGetParticipantReport = params => {
	return new Promise(async (res, rej) => {
		const { participant_search_keyword } = params
		//search user by name, use LIKE clause
		const participant = await Participant.findOne({
			name: { $regex: participant_search_keyword, $options: 'i' },
		})
		if (!participant) {
			return { status: 404, message: 'Participant not found' }
		}

		const result = await TestSession.findOne({ id_participant: participant._id.toString() }).select(
			'-_id -id_user -id_participant -payload',
		)
		if (!result) {
			return { status: 404, message: 'Test session not found' }
		}
		res(result)
	})
}

export const getTestData = async (req, res) => {
	try {
		const { id_test } = req.body
		const userId = req.user.id
		const user = await User.findById(userId)
		const idParticipant = user.id_participant
		const partData = await Participant.findById(idParticipant)
		const test = await Test.findById(id_test)

		const idInstance = partData.id_instansi.toString()
		const isInstance = test.instances.some(item => item._id === idInstance) //bo ol
		if (!isInstance) {
			return res.status(404).json({ message: 'Eh ngga ketemu. Stop jangan lanjyut' })
		}

		let questionList = []
		const qs = await Question.find()
		//jika ono
		const categories = test.questions
		for (const l of categories) {
			const idCategory = l._id.toString()
			const questions = qs.filter(item => item.id_category.toString() === idCategory)
			questionList.push({
				_id: l._id,
				name: l.name,
			})
		}

		return res.status(200).json({
			message: 'ok',
			data: questionList,
		})
	} catch (err) {
		return res.status(500).json({ message: err })
	}
}

export const getValidationQuestion = async (req, res) => {
	try {
		const { current, id } = req.body
		const test = await ValidationSession.findById(id)
		if (!test) {
			return res.status(404).json({ status: 404, message: 'Sesi tidak ditemukan' })
		}

		const qMap = test.question_done
		const qMeta = qMap.find(q => q.no === current)

		if (!qMeta) {
			return res.status(404).json({ status: 404, message: 'Soal tidak ditemukan' })
		}

		const idQuestion = qMeta.id_question.toString()

		const question = await Question.findById(idQuestion)
		//remove kunci jawaban
		if (!question) {
			return res.status(404).json({ status: 404, message: 'Soal tidak ditemukan' })
		}

		//Remove kunci jawaban
		question.answers = question.answers.map(a => ({
			value: a.value,
			id_answer: a.id_answer,
		}))

		return res.status(200).json({
			status: 200,
			message: 'ok',
			data: question,
		})
	} catch (err) {
		console.error('Error fetching validation question:', err)
		return { status: 500, message: 'Terjadi kesalahan server' }
	}
}

export const answerValidationQuestion = async (req, res) => {
	try {
		const { id_question, id_test, answer } = req.body
		const test = await ValidationSession.findById(id_test)
		if (!test) {
			return res.status(404).json({ status: 404, message: 'Sesi tidak ditemukan' })
		}

		const idAnswer = answer.id_answer
		const question = await Question.findById(id_question)
		const questionAnswer = question.answers.find(a => a.id_answer === idAnswer)
		const isCorrect = questionAnswer.is_correct
		const currentQuestion = test.state.current_question
		const questionDone = test.question_done.find(q => q.no === currentQuestion)
		if (!questionDone) {
			return res.status(404).json({ status: 404, message: 'Soal tidak ditemukan di sesi' })
		}

		questionDone.answered = true
		questionDone.correct = isCorrect
		questionDone.id_answer = idAnswer
		test.markModified('question_done')
		test.state.current_question += 1
		//notify update
		test.markModified('state')
		await test.save()
		return res.status(200).json({ status: 200, message: 'Jawaban berhasil disimpan', data: test })
	} catch (err) {
		console.error('Error answering validation question:', err)
		return { status: 500, message: 'Terjadi kesalahan server' }
	}
}
