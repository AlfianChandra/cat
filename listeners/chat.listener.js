import registry from '../utils/serviceregistry.utils.js'
import { useSocketAuth } from '../middlewares/authverifier.socket.middleware.js'

registry.waitFor('chatns', { timeoutMs: 1000 }).then(io => {
	io.use(useSocketAuth)
	io.on('connection', async socket => {
		let openai = await getOpenAIInstance()

    socket.on('chatbot:client_chat', (data) => { 
      
    })

		socket.on('disconnect', () => {
			logger.info(`[CHAT] client left: ${socket.id}`)
		})
	})
})

async function getOpenAIInstance() {
	const openai = await registry.waitFor('openai')
	return openai
}
