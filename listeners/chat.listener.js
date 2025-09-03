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
			let input = [
				{
					role: 'system',
					content: data.prompt,
				},
			]
			input.push(...data.conversation)
			console.log(input)
			return
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

async function getOpenAIInstance() {
	const openai = await registry.waitFor('openai')
	return openai
}
