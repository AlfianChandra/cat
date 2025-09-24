export const webmasterOnly = (req, res, next) => {
	const role = req.user?.role
	if (role === 'webmaster') {
		return next()
	}
	return res.status(403).json({ status: 403, message: 'Access denied.' })
}

export const userOnly = (req, res, next) => {
	const role = req.user?.role
	if (role === 'user') {
		return next()
	}
	return res.status(403).json({ status: 403, message: 'Access denied' })
}

export const adminOnly = (req, res, next) => {
	const role = req.user?.role
	if (role === 'admin' || role === 'webmaster') {
		return next()
	}
	return res.status(403).json({ status: 403, message: 'Access denied' })
}
