import express from 'express'
import { getProfile, uploadAvatar, updateProfile, updatePassword, getPhoneState, sendOtp, createUserAccount, getUsers } from '../controllers/user.controller.js'
import { getUserData, getUserActiveSession } from '../controllers/userdata.controller.js'
import multer from 'multer'
import {webmasterOnly, userOnly} from '../middlewares/restrictions.middleware.js'
const router = express.Router()
const storage = multer.memoryStorage()
const upload = multer({ storage })

router.get('/profile', getProfile)
router.post('/profile/avatar/upload', upload.single('image'), uploadAvatar)
router.post('/profile/update', updateProfile)
router.post('/profile/password/update', updatePassword)
router.get('/profile/phone/getstate', getPhoneState)
router.get('/profile/phone/verify/otp/send', sendOtp)

router.post('/account/create', webmasterOnly, createUserAccount)
router.post('/account/get', webmasterOnly, getUsers)

router.post('/data/get', userOnly, getUserData)
router.get('/data/activesession', userOnly, getUserActiveSession)
export default router