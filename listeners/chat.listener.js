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

registry.waitFor('chatns', { timeoutMs: 1000 }).then(io => {
	io.use(useSocketAuth)
	io.on('connection', async socket => {
		let openai = await getOpenAIInstance()

		console.log(`[CHAT] client connected: ${socket.id}`)
		socket.on('chatbot:client_chat', async data => {
			const options = data.assistant_options
			let input = formatConvo(options.memory, data.conversation)
			let response = await openai.responses.create({
				model: options.model,
				temperature: options.temperature,
				input,
				tools,
			})

			response.output.forEach(async item => {
				if (item.type === 'function_call') {
					if (item.name === 'get_participantreport') {
						const args = JSON.parse(item.arguments)
						const result = await fcGetParticipantReport(args)
						input.push({
							type: 'function_call_output',
							call_id: item.call_id,
							output: JSON.stringify(result),
						})
					}
				}
			})

			response = await openai.responses.create({
				model: 'gpt-5',
				tools,
				input,
			})

			console.log(response.output)
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
						type: 'input_image',
						image_url: media.data,
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
