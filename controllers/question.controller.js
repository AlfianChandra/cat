import { QuestionCat } from '../models/questionCat.model.js'
import { Question } from '../models/question.model.js'
import { fileUploader } from '../utils/fileUploader.js'
import { Test } from '../models/test.model.js'
import { Materi } from '../models/materi.model.js'
import mongoose from 'mongoose'

export const updateQuestionData = async (req, res) => {
	try {
		const { _id, ...updateValues } = req.body
		const question = await Question.findOneAndUpdate(
			{ _id: new mongoose.Types.ObjectId(_id) },
			updateValues,
			{ new: true },
		)
		if (!question) {
			return res.status(404).json({ status: 404, message: 'Pertanyaan tidak ditemukan' })
		}
		return res
			.status(200)
			.json({ status: 200, message: 'Pertanyaan berhasil diperbarui', data: question })
	} catch (error) {
		console.error('Error updating question data:', error)
		return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' })
	}
}

export const uploadQuestionImage = async (req, res) => {
	try {
		const { id_question, images } = req.body
		const question = await Question.findById(id_question)
		if (!question) {
			return res.status(404).json({ status: 404, message: 'Pertanyaan tidak ditemukan' })
		}

		const uploadedImages = await Promise.all(
			images.map(async img => {
				const filePath = await fileUploader().uploadImage(img.src)
				return { ...img, src: filePath }
			}),
		)
		// Add the uploaded images to the question
		question.images.push(...uploadedImages)
		await question.save()
		return res.status(200).json({ status: 200, message: 'Gambar pertanyaan berhasil diunggah' })
	} catch (error) {
		console.error('Error uploading question image:', error)
		return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' })
	}
}

export const deleteQuestionImage = async (req, res) => {
	try {
		const { id_question, id_image } = req.body
		const question = await Question.findById(id_question)
		if (!question) {
			return res.status(404).json({ status: 404, message: 'Pertanyaan tidak ditemukan' })
		}

		const imageIndex = question.images.findIndex(image => image.id === id_image)
		if (imageIndex === -1) {
			return res.status(404).json({ status: 404, message: 'Gambar tidak ditemukan' })
		}

		// Delete the image from the file system
		const imageToDelete = question.images[imageIndex]
		await fileUploader().deleteImage(imageToDelete.src)
		// Remove the image from the question
		question.images.splice(imageIndex, 1)
		await question.save()
		return res.status(200).json({ status: 200, message: 'Gambar pertanyaan berhasil dihapus' })
	} catch (error) {
		console.error('Error deleting question image:', error)
		return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' })
	}
}

export const updateQuestion = async (req, res) => {
	try {
		const { _id, soal } = req.body
		const question = await Question.findById(_id)
		if (!question) {
			return res.status(404).json({ status: 404, message: 'Pertanyaan tidak ditemukan' })
		}
		question.soal = soal
		await question.save()
		return res.status(200).json({ status: 200, message: 'Pertanyaan berhasil diperbarui' })
	} catch (error) {
		console.error('Error updating question:', error)
		return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' })
	}
}

export const updateQuestionAnswerSetCorrect = async (req, res) => {
	try {
		const { id_answer, id_question } = req.body
		const question = await Question.findById(id_question)
		if (!question) {
			return res.status(404).json({ status: 404, message: 'Pertanyaan tidak ditemukan' })
		}

		//Set all answers to not correct
		const incorrectAnswers = question.answers.map(answer => {
			return { ...answer, is_correct: false }
		})
		question.answers = incorrectAnswers

		const correctAnswer = question.answers.map(answer => {
			if (answer.id_answer.toString() === id_answer) {
				return { ...answer, is_correct: true }
			}
			return answer
		})
		question.answers = correctAnswer
		await question.save()
		return res.status(200).json({ status: 200, message: 'Jawaban berhasil ditandai sebagai benar' })
	} catch (error) {
		console.error('Error setting question answer as correct:', error)
		return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' })
	}
}

export const updateQuestionAnswer = async (req, res) => {
	try {
		const { value, id_answer, id_question } = req.body
		console.log(id_answer)
		const question = await Question.findById(id_question)
		if (question) {
			const answers = question.answers.map(answer => {
				if (answer.id_answer.toString() === id_answer) {
					console.log('!!!!!')
					return { ...answer, value: value }
				}
				return answer
			})
			question.answers = answers
			await question.save()
			return res
				.status(200)
				.json({ status: 200, message: 'Jawaban pertanyaan berhasil diperbarui' })
		} else {
			return res.status(404).json({ status: 404, message: 'Pertanyaan tidak ditemukan' })
		}
	} catch (error) {
		console.error('Error updating question answer:', error)
		return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' })
	}
}

//Questions
export const addQuestion = async (req, res) => {
	const {
		id_materi,
		answers,
		id_category,
		image,
		soalRaw,
		discussionRaw,
		soalParsed,
		discussionParsed,
		reference,
	} = req.body
	console.log(answers)
	try {
		const addQuestion = await QuestionCat.findById(id_category)
		if (!addQuestion) {
			return res.status(404).json({ status: 404, message: 'Kategori pertanyaan tidak ditemukan' })
		}

		const uploadedImages = await Promise.all(
			image.map(async img => {
				const filePath = await fileUploader().uploadImage(img.src)
				return { ...img, src: filePath }
			}),
		)

		// Bikin question setelah semua upload selesai
		const question = new Question({
			answers: answers,
			id_category: id_category,
			images: uploadedImages,
			reference: reference,
			id_materi: id_materi,
			soalRaw: soalRaw,
			soalParsed: soalParsed,
			discussionRaw: discussionRaw,
			discussionParsed: discussionParsed,
		})

		await question.save()

		return res.status(200).json({
			status: 200,
			message: 'Pertanyaan berhasil ditambahkan',
			data: question,
		})
	} catch (error) {
		console.error('Error adding question:', error)
		return res.status(500).json({
			status: 500,
			message: 'Terjadi kesalahan server',
		})
	}
}

//Category
export const addQuestionCat = async (req, res) => {
	const { name, description } = req.body
	try {
		const questionCat = new QuestionCat({
			name: name,
			description: description,
		})
		await questionCat.save()
		return res
			.status(200)
			.json({ status: 200, message: 'Kategori pertanyaan berhasil ditambahkan' })
	} catch (error) {
		console.error('Error adding question category:', error)
		return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' })
	}
}

export const updateQuestionCat = async (req, res) => {
	const { _id, name, description } = req.body
	try {
		const questionCat = await QuestionCat.findById(_id)
		if (!questionCat) {
			return res.status(404).json({ status: 404, message: 'Kategori pertanyaan tidak ditemukan' })
		}

		questionCat.name = name
		questionCat.description = description
		await questionCat.save()
		return res.status(200).json({ status: 200, message: 'Kategori pertanyaan berhasil diperbarui' })
	} catch (error) {
		console.error('Error updating question category:', error)
		return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' })
	}
}

export const getQuestionCat = async (req, res) => {
	try {
		const { search_key } = req.body
		const questionCats = await QuestionCat.find({
			$or: [
				{ name: { $regex: search_key, $options: 'i' } },
				{ description: { $regex: search_key, $options: 'i' } },
			],
		})
		if (questionCats.length === 0) {
			return res.status(404).json({ status: 404, message: 'Kategori pertanyaan tidak ditemukan' })
		}
		return res
			.status(200)
			.json({ status: 200, message: 'Kategori pertanyaan berhasil ditemukan', data: questionCats })
	} catch (error) {
		console.error('Error getting question categories:', error)
		return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' })
	}
}

export const deleteQuestionCat = async (req, res) => {
	const { _id } = req.body
	try {
		const questionCat = await QuestionCat.findById(_id)
		if (!questionCat) {
			return res.status(404).json({ status: 404, message: 'Kategori pertanyaan tidak ditemukan' })
		}

		// Delete all questions associated with the category
		const relatedQuestions = await Question.find({ id_category: _id })
		if (relatedQuestions.length > 0) {
			await Promise.all(
				relatedQuestions.map(async question => {
					// Delete all images associated with the question
					await Promise.all(
						question.images.map(async image => {
							await fileUploader().deleteImage(image.src)
						}),
					)
					await question.deleteOne()
				}),
			)
		}

		//Delete in test > questions aswell
		const tests = await Test.find({})
		tests.forEach(async test => {
			const questions = test.questions
			questions.forEach(question => {
				if (question._id.toString() === _id) {
					//Delete the question from the test
					test.questions = test.questions.filter(q => q._id.toString() !== _id)
				}
			})
			await test.save()
		})

		await questionCat.deleteOne()
		return res.status(200).json({ status: 200, message: 'Kategori pertanyaan berhasil dihapus' })
	} catch (error) {
		console.error('Error deleting question category:', error)
		return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' })
	}
}

export const getQuestion = async (req, res) => {
	const { id_category } = req.body

	try {
		const questions = await Question.find({ id_category }).lean() // lean = plain object, bukan Mongoose doc
		if (!questions.length) {
			return res.status(404).json({
				status: 404,
				message: 'Pertanyaan tidak ditemukan',
			})
		}

		const materiList = await Materi.find().lean()
		if (!materiList.length) {
			return res.status(404).json({
				status: 404,
				message: 'Materi tidak ditemukan',
			})
		}

		// bikin index materi biar pencarian O(1)
		const materiMap = new Map(materiList.map(m => [m._id.toString(), m]))

		// merge data
		const merged = questions.map(q => {
			const materi = materiMap.get(q.id_materi.toString())
			return {
				...q,
				id_materi: materi ? materi._id : q.id_materi,
				materi_name: materi ? materi.name : null,
			}
		})

		console.log(merged)

		return res.status(200).json({
			status: 200,
			message: 'Pertanyaan berhasil ditemukan',
			data: merged,
		})
	} catch (error) {
		console.error('Error getting question:', error)
		return res.status(500).json({
			status: 500,
			message: 'Terjadi kesalahan server',
		})
	}
}

export const deleteQuestion = async (req, res) => {
	const { _id } = req.body
	try {
		const question = await Question.findById(_id)
		if (!question) {
			return res.status(404).json({ status: 404, message: 'Pertanyaan tidak ditemukan' })
		}
		// Delete all images associated with the question
		await Promise.all(
			question.images.map(async image => {
				await fileUploader().deleteImage(image.src)
			}),
		)
		await question.deleteOne()
		return res.status(200).json({ status: 200, message: 'Pertanyaan berhasil dihapus' })
	} catch (error) {
		console.error('Error deleting question:', error)
		return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' })
	}
}
