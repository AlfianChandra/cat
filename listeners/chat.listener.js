import registry from '../utils/serviceregistry.utils.js'
import { useSocketAuth } from '../middlewares/authverifier.socket.middleware.js'
import { fcGetParticipantReport } from '../controllers/test.controller.js'

const tools = [
	{
		type: 'function',
		name: 'get_participantreport',
		description:
			'Mengambil data hasil ujian partisipan. Fungsi ini mencari data hasil ujian peserta',
		parameters: {
			type: 'object',
			properties: {
				participant_search_keyword: {
					type: 'string',
					description: 'Keyword untuk mencari partisipan berdasarkan nama',
				},
			},
			required: ['participant_search_keyword'],
		},
	},
]

registry
	.waitFor('chatns', { timeoutMs: 1000 })
	.then(io => {
		io.use(useSocketAuth)
		io.on('connection', async socket => {
			let openai = await getOpenAIInstance()
			console.log(`[CHAT] client connected: ${socket.id}`)

			socket.on('chatbot:client_chat', async data => {
				try {
					const { assistant_options: options, conversation } = data
					const messages = formatConvoForChat(options, conversation)

					console.log('Messages:', messages)

					// Pake Chat Completions dengan streaming
					const stream = await openai.chat.completions.create({
						model: options.model || 'gpt-4o-mini',
						temperature: options.temperature ?? 0.7,
						messages,
						stream: true,
					})

					let fullResponse = ''

					// Loop setiap chunk
					for await (const chunk of stream) {
						const delta = chunk.choices[0]?.delta?.content || ''

						if (delta) {
							fullResponse += delta

							socket.emit('chatbot:completion_respond', {
								data: {
									content: delta,
								},
								error: false,
							})

							console.log('Streaming chunk:', delta)
						}
					}

					// Signal selesai
					socket.emit('chatbot:completion_respond_end', {
						data: {
							content: fullResponse,
						},
						error: false,
					})

					console.log('✅ Stream complete.')
				} catch (error) {
					console.error('💀 Error in chatbot handler:', error)

					socket.emit('chatbot:completion_respond_end', {
						message: error.message,
						error: true,
					})
				}
			})

			socket.on('disconnect', () => {
				console.log(`[CHAT] client left: ${socket.id}`)
			})
		})
	})
	.catch(error => {
		console.error('[CHAT] Failed to initialize chat namespace:', error)
	})

// Update formatConvo buat inject system prompt
const formatConvoForChat = (options, conversation) => {
	const memoryLimit = options.memory
	const lastKnownConvo = conversation.slice(-memoryLimit)

	// System prompt di awal
	const messages = [
		{
			role: 'system',
			content: options.prompt.trim(),
		},
	]

	// Mapping conversation
	lastKnownConvo.forEach(msg => {
		if (msg.media == null) {
			// Simple text message
			messages.push({
				role: msg.role,
				content: msg.message,
			})
		} else {
			// Message dengan media
			const contentArray = []

			msg.media.forEach(media => {
				if (media.type === 'image') {
					contentArray.push({
						type: 'image_url',
						image_url: {
							url: media.data,
						},
					})
				} else {
					contentArray.push({
						type: 'text',
						text: `Berikut adalah data hasil ekstraksi dari file ${media.type} bernama ${media.name}: ${media.markdown || media.data}`,
					})
				}
			})

			contentArray.push({
				type: 'text',
				text: msg.message,
			})

			messages.push({
				role: msg.role,
				content: contentArray,
			})
		}
	})

	return messages
}

async function getOpenAIInstance() {
	const openai = await registry.waitFor('openai')
	return openai
}
