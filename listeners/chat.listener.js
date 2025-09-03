import registry from '../utils/serviceregistry.utils.js'
import { useSocketAuth } from '../middlewares/authverifier.socket.middleware.js'

const tools = [
	{
		type: 'function',
		name: 'get_participantreport',
		description:
			'Mengambil data hasil ujian partisipan. Fungsi ini mencari data hasil ujian peserta pada sebuah tes',
		parameters: {
			type: 'object',
			properties: {
				participant_search_keyword: {
					type: 'string',
					description: 'Keyword untuk mencari partisipan berdasarkan nama',
				},
				test_search_keyword: {
					type: 'string',
					description: 'Keyword untuk mencari data assesmen',
				},
			},
			required: ['participant_search_keyword', 'test_search_keyword'],
		},
	},
]

registry.waitFor('chatns', { timeoutMs: 1000 }).then(io => {
	io.use(useSocketAuth)
	io.on('connection', async socket => {
		let openai = await getOpenAIInstance()

		console.log(`[CHAT] client connected: ${socket.id}`)
		socket.on('chatbot:client_chat', async data => {
			const options = data.assistant_options
			const input = formatConvo(options.memory, data.conversation)
			const response = await openai.responses.create({
				model: options.model,
				temperature: options.temperature,
				input,
				tools,
			})

			response.output.forEach(item => {
				if (item.type === 'function_call') {
					if (item.name === 'get_participantreport') {
						const args = JSON.parse(item.arguments)
						console.log(args)
					}
				}

				console.log(item)
			})
		})

		socket.on('disconnect', () => {
			console.log(`[CHAT] client left: ${socket.id}`)
		})
	})
})

const formatConvo = (memory, conversation) => {
	const memoryLimit = memory
	const lastKnownConvo = conversation.slice(-memoryLimit)
	const convo = lastKnownConvo.map(msg => {
		if (msg.media == null) {
			return {
				role: msg.role,
				content: [
					{
						type: 'input_text',
						text: msg.message,
					},
				],
			}
		} else {
			let structure = []
			msg.media.forEach(media => {
				if (media.type === 'image') {
					structure.push({
						type: 'image_url',
						image_url: {
							url: media.data,
							detail: 'auto',
						},
					})
				} else {
					structure.push({
						type: 'input_text',
						text: `Berikut adalah data hasil ekstraksi dari file ${
							media.type
						} bernama ${media.name}: ${media.markdown == undefined ? media.data : media.markdown}`,
					})
				}
			})

			structure.push({
				type: 'input_text',
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
