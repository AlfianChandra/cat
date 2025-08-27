import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { Login } from './models/login.model.js'
import passport from 'passport'
import path from 'path'
import './utils/authGoogle.js'
import jwt from 'jsonwebtoken'
import userRoutes from './routes/user.routes.js'
import authRoutes from './routes/auth.routes.js'
import instanceRoutes from './routes/instance.routes.js'
import participantRoutes from './routes/participant.routes.js'
import questionRoutes from './routes/question.routes.js'
import materiRoutes from './routes/materi.routes.js'
import testRouters from './routes/test.routes.js'
import { useLog } from './middlewares/log.middleware.js'
import { useAuthVerifier } from './middlewares/authverifier.middleware.js'
dotenv.config()
const app = express()

//=======DB CONNECTION
const connection = {
	live: process.env.DB_USELOCAL ? false : true,
	localUri: process.env.DB_LOCAL,
	liveUri: process.env.DB_LIVE,
}
console.log(connection)
mongoose
	.connect(connection.live ? connection.liveUri : connection.localUri)
	.then(() => {
		console.log(
			`MongoDB: ${connection.live ? 'Connected to Live Database' : 'Connected to Local Database'}`,
		)
	})
	.catch(error => {
		console.error('MongoDB connection error:', error)
	})
//========Setups
app.disable('x-powered-by')
app.use(express.urlencoded({ extended: true }))
app.use(passport.initialize())
//========Middlewares
app.use(cors())
app.use(morgan('dev'))
app.use(express.json({ limit: '90mb' }))
app.use(useLog)
app.use(useAuthVerifier)
//=========Routes
app.use('/usercontent', express.static(path.join(process.cwd(), 'usercontent')))
app.use('/usercontent/image', express.static(path.join(process.cwd(), 'user_generated')))
app.get('/api/v1/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }))
app.get(
	'/api/v1/auth/google/callback',
	passport.authenticate('google', { session: false }),
	async (req, res) => {
		if (req.authInfo.code == 404) {
			res.redirect(
				`http://localhost:5173/auth/login?register=true&local=false&email=${req.authInfo.email}&name=${req.authInfo.name}`,
			)
		} else if (req.authInfo.code == 401) {
			res.redirect(`http://localhost:5173/auth/login?linked=false`)
		} else if (req.authInfo.code == 200) {
			try {
				const token = jwt.sign({ id: req.user._id, role: 'user' }, process.env.JWT_SECRET, {
					expiresIn: '1h',
				})
				const newLogin = new Login({
					userId: req.user._id,
					token: token,
					ipAddress: req.ip,
					method: 'google_login',
					userAgent: req.headers['user-agent'],
					email: req.user.email,
					timestamp: new Date(),
				})
				// Save login information
				await newLogin.save()
				res.redirect(
					`http://localhost:5173/auth/login/callback?token=${token}&userId=${req.user._id}&name=${req.user.name}`,
				)
			} catch (error) {
				console.error('Error during Google login:', error)
				res.status(500).json({ status: 500, message: 'Internal server error' })
			}
		}
	},
)
app.use('/api/v1/users', userRoutes)
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/instances', instanceRoutes)
app.use('/api/v1/participant', participantRoutes)
app.use('/api/v1/question', questionRoutes)
app.use('/api/v1/materi', materiRoutes)
app.use('/api/v1/test', testRouters)

export default app
