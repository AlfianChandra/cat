import express from 'express'
import {
	createMateri,
	getMateri,
	updateMateri,
	deleteMateri,
} from '../controllers/materi.controller.js'
import { webmasterOnly } from '../middlewares/restrictions.middleware.js'

const router = express.Router()

router.post('/create', webmasterOnly, createMateri)
router.get('/get', webmasterOnly, getMateri)
router.post('/update', webmasterOnly, updateMateri)
router.post('/delete', webmasterOnly, deleteMateri)

export default router
