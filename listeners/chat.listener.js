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
					const input = formatConvo(options.memory, conversation)

					console.log('Input:', input)

					// Create streaming response
					const stream = await openai.responses.stream({
						model: options.model || 'gpt-4o-mini',
						temperature: options.temperature ?? 0.7,
						input,
					})

					let fullResponse = ''

					// Loop untuk setiap chunk stream
					for await (const chunk of stream) {
						// Cek apakah ada content text di chunk
						console.log(chunk)
						if (chunk?.output?.[0]?.content) {
							for (const content of chunk.output[0].content) {
								if (content.type === 'text' && content.text) {
									const textChunk = content.text
									fullResponse += textChunk

									// Emit chunk ke frontend dengan format yang sesuai
									socket.emit('chatbot:completion_respond', {
										data: {
											content: textChunk,
										},
										error: false,
									})

									console.log('Streaming chunk:', textChunk)
								}
							}
						}
					}

					// Emit signal bahwa streaming sudah selesai
					socket.emit('chatbot:completion_respond_end', {
						data: {
							content: fullResponse,
						},
						error: false,
					})

					console.log('✅ Stream complete.')
				} catch (error) {
					console.error('💀 Error in chatbot handler:', error)

					// Emit error ke frontend
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

const formatConvo = (memory, conversation) => {
	const memoryLimit = memory
	const lastKnownConvo = conversation.slice(-memoryLimit)

	const convo = lastKnownConvo.map(msg => {
		// Tentukan content type berdasarkan role
		const isUser = msg.role === 'user'

		if (msg.media == null) {
			return {
				role: msg.role,
				content: isUser
					? msg.message
					: [
							{
								type: 'output_text', // untuk assistant/system
								text: msg.message,
							},
						],
			}
		} else {
			// Kalau ada media
			let structure = []

			msg.media.forEach(media => {
				if (media.type === 'image') {
					structure.push({
						type: 'input_image',
						image_url: media.data,
					})
				} else {
					structure.push({
						type: isUser ? 'input_text' : 'output_text',
						text: `Berikut adalah data hasil ekstraksi dari file ${
							media.type
						} bernama ${media.name}: ${media.markdown == undefined ? media.data : media.markdown}`,
					})
				}
			})

			structure.push({
				type: isUser ? 'input_text' : 'output_text',
				text: msg.message,
			})

			return {
				role: msg.role,
				content: structure,
			}
		}
	})

	return convo
}

async function getOpenAIInstance() {
	const openai = await registry.waitFor('openai')
	return openai
}
