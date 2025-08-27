import express from 'express'
import {
	addQuestionCat,
	updateQuestionCat,
	deleteQuestionCat,
	getQuestionCat,
	updateQuestionData,
} from '../controllers/question.controller.js'
import {
	addQuestion,
	getQuestion,
	deleteQuestion,
	updateQuestion,
	deleteQuestionImage,
	uploadQuestionImage,
} from '../controllers/question.controller.js'
import {
	updateQuestionAnswer,
	updateQuestionAnswerSetCorrect,
} from '../controllers/question.controller.js'
import { webmasterOnly, userOnly } from '../middlewares/restrictions.middleware.js'
const router = express.Router()

// Question Categories
router.post('/cat/create', webmasterOnly, addQuestionCat)
router.post('/cat/update', webmasterOnly, updateQuestionCat)
router.post('/cat/delete', webmasterOnly, deleteQuestionCat)
router.post('/cat/get', webmasterOnly, getQuestionCat)

//Questions
router.post('/add', webmasterOnly, addQuestion)
router.post('/get', webmasterOnly, getQuestion)
router.post('/delete', webmasterOnly, deleteQuestion)
router.post('/update', webmasterOnly, updateQuestion)
router.post('/update/data', webmasterOnly, updateQuestionData)

router.post('/image/delete', webmasterOnly, deleteQuestionImage)
router.post('/image/edit/upload', webmasterOnly, uploadQuestionImage)

//Question answers
router.post('/answer/update', webmasterOnly, updateQuestionAnswer)
router.post('/answer/setcorrect', webmasterOnly, updateQuestionAnswerSetCorrect)
export default router
