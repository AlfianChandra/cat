import express from 'express'
import { clientLogin, clientRegister, clientLogout, clientLoginWebmaster } from '../controllers/auth.controller.js'
const router = express.Router()
router.post('/login', clientLogin)
router.post('/login/webmaster', clientLoginWebmaster)
router.post('/register', clientRegister)
router.post('/logout', clientLogout)
export default router  