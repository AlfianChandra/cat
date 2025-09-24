import express from 'express'
const {
	createTest,
	getTest,
	updateTestSoal,
	updateTestName,
	updateTestInstance,
	updateTestRandomize,
	updateTestDescription,
	verifyTestPassword,
	updateTestPassword,
	updateTestTimeLimit,
	deleteTest,
	startTest,
	getUserTestSessions,
	getSoalData,
	getTestReport,
	getMateriScores,
	updateTestAccess,
	getUserSessions,
	getParticipantsByInstance,
	fixParticipantAnswers,
	getTestSessionData,
	getCurrentSession,
	getQuestion,
	answerQuestion,
	setAsCompleted,
	getSescatDetail,
	getTestData,
	startValidation,
} = await import('../controllers/test.controller.js')
import { webmasterOnly, userOnly } from '../middlewares/restrictions.middleware.js'
const router = express.Router()

router.post('/create', webmasterOnly, createTest)
router.get('/get', webmasterOnly, getTest)
router.post('/update/soal', webmasterOnly, updateTestSoal)
router.post('/update/name', webmasterOnly, updateTestName)
router.post('/update/instance', webmasterOnly, updateTestInstance)
router.post('/update/description', webmasterOnly, updateTestDescription)
router.post('/update/timelimit', webmasterOnly, updateTestTimeLimit)
router.post('/update/randomize', webmasterOnly, updateTestRandomize)
router.post('/update/password', webmasterOnly, updateTestPassword)
router.post('/update/access', webmasterOnly, updateTestAccess)
router.post('/delete', webmasterOnly, deleteTest)
router.post('/verify/password', userOnly, verifyTestPassword)
router.post('/start', userOnly, startTest)

router.post('/session/setcompleted', userOnly, setAsCompleted)
router.post('/session/data', userOnly, getTestSessionData)
router.post('/session/current', userOnly, getCurrentSession)
router.post('/session/question', userOnly, getQuestion)
router.post('/session/answer', userOnly, answerQuestion)
router.get('/session/user', userOnly, getUserSessions)
router.post('/session/questioncat/detail', webmasterOnly, getSescatDetail)

router.post('/data/get', userOnly, getTestData)
router.post('/validation/start', userOnly, startValidation)

// Recalculate participant answer correctness
router.post('/session/fixanswers', webmasterOnly, fixParticipantAnswers)

router.post('/user/sessions', webmasterOnly, getUserTestSessions)
router.post('/participants/byinstance/get', webmasterOnly, getParticipantsByInstance)
router.post('/get/soal', webmasterOnly, getSoalData)
router.post('/report/get', webmasterOnly, getTestReport)
router.post('/report/materi', webmasterOnly, getMateriScores)

export default router
