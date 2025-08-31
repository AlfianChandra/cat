import moment from 'moment'
import { complEventHandler, complEventEmitter } from '../events/completionEvents.js'
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const systemPrompt = `Nama kamu CATeline. Kamu didesain khusus untuk aplikasi bernama Computerized Adaptive Test.
            Kamu tidak tertarik pembahasan lain selain keahlian kamu.
            Kamu adalah asisten AI yang sangat ahli dalam bidang asesmen, ujian, pendidikan, Computerized Adaptive Testing (CAT),
            analisis data hasil ujian, pengembangan soal, evaluasi pendidikan dan pembelajaran, audit pembelajaran, dan pengembangan kurikulum.

            Kamu memiliki pengetahuan yang luas tentang berbagai topik terkait pendidikan, asesmen, dan teknologi pendidikan.
            Aplikasi ini adalah aplikasi ujian berbasis web yang menggunakan teknologi Computerized Adaptive Testing (CAT).
            Pola soal yang digunakan dalam aplikasi ini adalah soal pilihan ganda dengan 5 opsi jawaban.
            Masing-masing soal memiliki tingkat kesulitan yang berbeda, tergantung pada kemampuan pengguna.
            Sebagai contoh, jika pengguna menjawab soal dengan benar, maka soal berikutnya akan lebih sulit.
            Sebaliknya, jika pengguna menjawab soal dengan salah, maka soal berikutnya akan lebih mudah.
            Prinsip ini sebagai dasar pengetahuan kamu dalam memberikan jawaban yang relevan dan bermanfaat.

            Kamu akan membantu pengguna dengan memberikan jawaban yang akurat, relevan, dan bermanfaat sesuai dengan konteks yang diberikan.
            Kamu juga dapat memberikan saran dan rekomendasi yang sesuai dengan kebutuhan pengguna. Kamu menolak membahas hal lain selain keahlianmu.
            Kamu dikembangkan oleh Alfian Chandra (Full-stack Developer aplikasi ini), jika ada yang bertanya.
            Kamu tidak boleh memberikan informasi pribadi atau sensitif tentang dirimu.

            Kamu memiliki kepribadian yang sedikit serius, tegas, namun tetap ramah.
            Kamu sangat mahir berbahasa inggris dan indonesia
              `
const modelsMap = [
	{ name: '4.1 (Flagship)', value: 'gpt-4.1-2025-04-14' },
	{
		name: '4.1 Mini (Cost-efficient - Flagship)',
		value: 'gpt-4.1-mini-2025-04-14',
	},
	{ name: '4.1 Nano', value: 'gpt-4.1-nano-2025-04-14' },
]
let functions = []

export const useAiCompletion = () => {
	const handleAnalyzer = async (socket, openai) => {
		socket.on('socket-analyzer:send-data', async payload => {
			const massages = [
				{
					role: 'system',
					content: systemPrompt,
				},
				{
					role: 'user',
					content: `Berikut data yang diperoleh dari halaman ${payload.from}. Prompt: ${payload.prompt}. Datanya: ${payload.payload}`,
				},
			]

			try {
				const response = await openai.chat.completions.create({
					model: 'gpt-4.1-mini-2025-04-14',
					messages: massages,
					temperature: 1,
					top_p: 1,
					stream: true,
				})

				for await (const chunk of response) {
					if (chunk.choices[0].delta.content) {
						socket.emit('socket-analyzer:on-response', {
							status: 200,
							data: {
								content: chunk.choices[0].delta.content,
							},
						})
					}
				}

				socket.emit('socket-analyzer:on-response-end')
			} catch (error) {
				console.log(error)
			}
		})
	}
	const handleCompletion = async (socket, openai) => {
		socket.on(complEventHandler.ONCHAT, async data => {
			const options = { ...data.assistant_options }
			console.log(options)
			if (!validateModel(options.model)) {
				socket.emit(complEventEmitter.EMIT_RESPOND_END, {
					status: 401,
					error: true,
					message: 'Invalid model selected',
				})
				return
			}

			try {
				const conversation = formatConvo(options.memory, data.conversation)
				let messages = []
				//Set prompt
				if (options.prompt) {
					messages.push({
						role: 'system',
						content: options.prompt,
					})

					messages.push({
						role: 'system',
						content:
							'Pengguna dapat mengirimkan file berupa gambar, PDF, dan Excel. Kamu dapat menjawab pertanyaan berdasarkan data yang terdapat pada file tersebut. Gunakan bahasa yang santai dan mudah dimengerti.',
					})
				}
				//Set conversation
				messages = messages.concat(conversation)
				let response = null
				if (options.function_calling && functions.length > 0) {
					response = await openai.chat.completions.create({
						model: options.model,
						messages: messages,
						temperature: options.temperature || 1,
						top_p: options.top_p || 1,
						functions: functions.length > 0 ? functions : null,
						stream: false,
						function_call: 'auto',
					})

					const choice = response.choices
					if (choice[0].finish_reason === 'function_call') {
						const functionName = choice[0].message.function_call.name
						const functionArgs = choice[0].message.function_call.arguments
						// Call the function with the arguments
					} else {
						socket.emit(complEventEmitter.EMIT_RESPOND, {
							status: 200,
							data: {
								content: response.choices[0].message.content,
							},
						})
					}
				} else {
					response = await openai.chat.completions.create({
						model: options.model,
						messages: messages,
						temperature: options.temperature || 0.7,
						top_p: options.top_p || 0.9,
						stream: true,
					})

					for await (const chunk of response) {
						if (chunk.choices[0].delta.content) {
							socket.emit(complEventEmitter.EMIT_RESPOND, {
								status: 200,
								data: {
									content: chunk.choices[0].delta.content,
								},
							})
						}
					}
				}
				socket.emit(complEventEmitter.EMIT_RESPOND_END, {
					status: 200,
				})
			} catch (error) {
				console.error('Error in AI completion:', error)
				socket.emit(complEventEmitter.EMIT_RESPOND_ERROR, {
					status: 500,
					error: true,
					message: 'Internal error: ' + error,
				})
				return
			}

			// const string = "Alfian Chandra";
			// //loop the string for testing
			// for (const s of string) {
			//   await delay(1000); // Simulate processing delay
			//   socket.emit(complEventEmitter.EMIT_RESPOND, {
			//     status: 200,
			//     data: {
			//       content: s,
			//     },
			//   });
			// }

			// socket.emit(complEventEmitter.EMIT_RESPOND_END, {
			//   status: 200,
			//   data: {
			//     content: "Processing complete",
			//   },
			// });
		})
	}

	const handleGlobalCompletion = async (socket, openai) => {
		socket.on('socket-global:send-data', async data => {
			const messages = [
				{
					role: 'system',
					content: `${data.system_prompt}`,
				},
				{
					role: 'user',
					content: `Berikut data yang diperoleh dari halaman ${data.from}. Prompt: ${data.prompt}. Datanya: ${data.payload}`,
				},
			]
			try {
				const response = await openai.chat.completions.create({
					model: 'gpt-4.1-mini-2025-04-14',
					messages: messages,
					temperature: 1,
					top_p: 1,
					stream: true,
				})

				for await (const chunk of response) {
					if (chunk.choices[0].delta.content) {
						socket.emit('socket-global:on-response', {
							status: 200,
							data: {
								content: chunk.choices[0].delta.content,
							},
						})
					}
				}

				socket.emit('socket-global:on-response-end', {
					status: 200,
				})
			} catch (error) {
				console.error('Error in global completion:', error)
			}
		})
	}

	const handlePrecall = async (socket, openai) => {
		socket.on(complEventHandler.ONPRECALL, async data => {
			console.log('Pre-call data received:', data)
			const message = [
				{
					role: 'system',
					content: `
          Kamu adalah classifier yang mendeteksi apakah sebuah input termasuk permintaan untuk memanggil fungsi (function call) atau bukan.

          Function call artinya: permintaan eksplisit untuk melakukan sesuatu secara otomatis seperti menghitung, menerjemahkan, menjadwalkan, mengambil data, mencari informasi, menjalankan perintah spesifik.

          Jawaban kamu hanya boleh: "true" atau "false" (string, huruf kecil semua). Tidak boleh memberikan penjelasan apapun.

          Contoh:
          - "Aku minta data x dong" → true
          - "Bisa bantu aku dengan data x?" → true
          - "Apa itu lubang hitam?" → false
          - "Aku minta data ujian terbaru" → true
          - "Aku capek banget hari ini" → false
    `,
				},
				{
					role: 'user',
					content: data.message,
				},
			]

			try {
				const response = await openai.chat.completions.create({
					model: 'gpt-4.1-mini-2025-04-14',
					messages: message,
					temperature: 0.0,
					top_p: 1.0,
					stream: false,
				})

				const content = response.choices[0].message.content.trim().toLowerCase()
				socket.emit(complEventEmitter.EMIT_PRECALL, {
					status: 200,
					data: {
						content: content === 'true' ? true : false,
					},
				})
			} catch (error) {
				socket.emit(complEventEmitter.EMIT_PRECALL_ERROR, {
					status: 500,
					error: true,
					message: 'Internal error: ' + error.message,
				})
				return
			}
		})
	}

	const setFunctions = func => {
		functions = func
	}

	const handleGlobalResponseAPI = async (socket, openai, input, emitTo, emitCompleted = null) => {
		try {
			const response = await openai.responses.create({
				model: 'gpt-4.1-mini-2025-04-14',
				temperature: 0.9,
				top_p: 1.0,
				input,
				stream: true,
			})

			for await (const d of response) {
				console.log(d.delta)
				if (d.delta != undefined) {
					socket.emit(emitTo, d.delta)
				}

				if (emitCompleted) {
					if (d.type === 'response.completed') {
						console.log(d)
						socket.emit(emitCompleted)
					}
				}
			}
		} catch (err) {
			console.error('Error in global response API:', err)
		}
	}

	return {
		handleCompletion,
		handlePrecall,
		setFunctions,
		handleGlobalCompletion,
		handleAnalyzer,
		handleGlobalResponseAPI,
	}
}

const respondAgent = (messages, openai, options) => {
	const convo = []
	convo.push({
		role: 'system',
		content:
			'Kamu adalah Respond Agent. Kamu memberikan respon kepada pengguna terkait function calls yang dilakukan oleh AI. Kamu adalah AI yang sangat ahli di bidang oil and gas, terutama di hulu migas, menguasai data kualitas crude oil (BS&W), SC, lakukan analisa saran dan rekomendasi dan faktor penyebab nilai BS&W tersebut terjadi. Berikan rekomendasi dan potensi faktor penyebab konkrit dan radikal terkait analisa BSNW. Gunakan bahasa yang santai, gaul, dan asik serta mudah dipahami. Pedoman kamu untuk menghitung nilai BSNW menggunakan persamaan ini: y = 0.130869 - 0.00052 * (spot3 - spot2)',
	})
	messages.forEach(msg => {
		convo.push(msg)
	})
	return new Promise(async (resolve, reject) => {
		try {
			const response = await openai.chat.completions.create({
				model: options.model,
				messages: convo,
				max_tokens: options.max_tokens || 1000,
				temperature: 1,
				top_p: 1,
				stream: false,
			})

			resolve(response.choices[0].message.content)
		} catch (error) {
			reject(`Error in AI completion: ${error.message}`)
		}
	})
}

const validateModel = model => {
	return modelsMap.some(m => m.value === model)
}

const formatConvo = (memory, conversation) => {
	const memoryLimit = memory
	const lastKnownConvo = conversation.slice(-memoryLimit)
	const convo = lastKnownConvo.map(msg => {
		if (msg.media == null) {
			return {
				role: msg.role,
				content: msg.message,
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
						type: 'text',
						text: `Berikut adalah data hasil ekstraksi dari file ${
							media.type
						} bernama ${media.name}: ${media.markdown == undefined ? media.data : media.markdown}`,
					})
				}
			})

			structure.push({
				type: 'text',
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
