import jwt from 'jsonwebtoken'
import { Login } from '../models/login.model.js'
const routerExclusions = [
	'/api/v1/auth/login',
	'/api/v1/auth/register',
	'/api/v1/auth/google',
	'/api/v1/auth/google/callback',
	'/usercontent/avatars',
	'/usercontent/image',
	'/socket.io',
	'/pre-call',
	'/completion',
]
const allowedOrigins = [
	'http://localhost:5173', //Dev - Vite
	'http://localhost:2512',
	'https://accounts.google.com/', //Google
	'PostmanRuntime', //Dev - Postman
	'https://imanextgencbt.id/',
]
export const useAuthVerifier = (req, res, next) => {
	//get route
	const route = req.originalUrl
	//Bypass routes
	if (routerExclusions.some(path => route.startsWith(path))) {
		return next()
	}
	//Get user origin
	const userOrigin = req.headers['origin'] || req.headers['referer'] || req.headers['user-agent']
	//Check if origin is allowed
	if (!allowedOrigins.some(origin => userOrigin?.includes(origin))) {
		return res.status(403).json({ status: 403, message: 'Forbidden - Unauthorized Origin' })
	}

	//Get token, watch out for 'Bearer'
	const token = req.headers['authorization']?.split(' ')[1] || req.query.token || req.body.token
	if (!token) {
		console.log('36: AuthVerifier -> Token not found')
		return res.status(401).json({ status: 401, message: 'Unauthorized' })
	}
	//Verify token
	try {
		jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
			if (err) {
				if (err.name == 'TokenExpiredError') {
					const userId = jwt.decode(token).id
					const login = await Login.findOne({ userId: userId })
					if (login) {
						//Delete fron login
						await Login.deleteOne({ userId: userId })
						console.log('45: AuthVerifier -> Token expired, deleting login for user ID: ', userId)
						return res
							.status(401)
							.json({ status: 401, message: 'verification failed - token expired' })
					}
				} else if (err.name === 'JsonWebTokenError') {
					console.log('50: AuthVerifier -> Token verification failed: ', err.message)
					return res
						.status(401)
						.json({ status: 401, message: `verification failed - ${err.message}` })
				} else {
					console.log('52: AuthVerifier -> Token verification failed: ', err.message)
					return res.status(401).json({ status: 401, message: `${err.name} -> ${err.message}` })
				}
			}
			//Set user id in request
			req.user = {
				id: decoded.id,
				role: decoded.role,
			}

			next()
		})
	} catch (error) {
		console.error('60: AuthVerifier -> Error verifying token: ', error)
		return res.status(500).json({ status: 500, message: 'Internal Server Error' })
	}
}
