import app from './app.js'
import { Server } from 'socket.io'
import http from 'http'
import OpenAI from 'openai'
import { useSocketAuth } from './middlewares/authverifier.socket.middleware.js'
import { useAiCompletion } from './socket/ai.completion.ctrl.js'
import path from 'path'
import mime from 'mime'
import fs from 'fs'

const aiCompletion = useAiCompletion()
const server = http.createServer(app)
const io = new Server(server, {
	maxHttpBufferSize: 1e8, // 100MB
	cors: {
		origin: '*',
		methods: ['GET', 'POST'],
	},
})
const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
})

const preCallNamespace = io.of('/pre-call')
const completionNamespace = io.of('/completion')
const analyzerNamespace = io.of('/analyzer')
const discussionNamespace = io.of('/discussion')
const summNamespace = io.of('/summ')

preCallNamespace.use(useSocketAuth)
completionNamespace.use(useSocketAuth)
discussionNamespace.use(useSocketAuth)
summNamespace.use(useSocketAuth)

summNamespace.on('connection', socket => {
	socket.on('summ:generate', data => {
		let input = [
			{
				role: 'system',
				content: `Kamu adalah asisten AI yang sangat cerdas dalam sumarisasi hasil ujian. Dalam memproduksi respon, 
        Kamu Fokus pada:
        1. Analisis Hasil Ujian
        2. Diagnosis Hasil Ujian
        3. Skor akhir / nilai total.
        4. Kekuatan siswa (materi yang dikuasai).
        5. Kelemahan siswa (materi yang belum dikuasai).
        6. Rekomendasi perbaikan atau tindak lanjut.
        7. Insight tambahan (jika ada).
        8. Rekomendasi/masukan untuk tenaga pengajar
        9. Rekomendasi Pendekatan/Metode mengajar

        Produksi analisis yang sangat detail, sangat panjang, dan sangat lengkap.
        Langsung sumarisasi, jangan gunakan intro, jangan menawarkan analisis lebih lanjut, jangan mengulang pertanyaan pengguna. Hanya hasilkan sumarisasi yang berguna.
        `,
			},
			{
				role: 'user',
				content: `Berikut adalah data hasil ujian: ${data.examResults}`,
			},
		]
		aiCompletion.handleGlobalResponseAPI(
			socket,
			openai,
			input,
			'summ:generate-result',
			'summ:generate-result-completed',
		)
	})
})

discussionNamespace.on('connection', socket => {
	console.log('Discussion!')
	socket.on('disc:generate', data => {
		const image = data.image
		let input = [
			{
				role: 'system',
				content:
					'Kamu adalah asisten yang sangat pintar fisika dan matematika. Tugas kamu membuat pembahasan soal dan memastikan apakah kunci jawaban benar. Gunakan bahasan yang mudah dipahami agar pengguna mudah memahami pembahasan soal dan beritahu di akhir pembahasan apakah kunci jawaban yang diberikan benar atau salah',
			},
			{
				role: 'user',
				content: `Berikut adalah pertanyaannya: ${data.question}`,
			},
			{
				role: 'user',
				content: `Berikut adalah kunci jawabannya: ${data.answer}`,
			},
		]

		if (image != null) {
			const __dirname = path.resolve()
			const imgPath = path.join(__dirname, 'user_generated', image)
			const dataUri = fileToBase64(imgPath)
			input.push({
				role: 'user',
				content: [
					{ type: 'input_text', text: 'Berikut adalah gambar yang direferensikan oleh pertanyaan' },
					{ type: 'input_image', image_url: dataUri },
				],
			})
		}
		aiCompletion.handleGlobalResponseAPI(socket, openai, input, 'disc:generate-result')
	})

	function fileToBase64(filePath) {
		try {
			const fileBuffer = fs.readFileSync(filePath)
			const base64 = fileBuffer.toString('base64')

			// deteksi mime type dari extension
			const mimeType = mime.getType(filePath) || 'application/octet-stream'

			// jadiin Data URI lengkap
			return `data:${mimeType};base64,${base64}`
		} catch (err) {
			console.error('❌ Error reading file:', err)
			return null
		}
	}
})

analyzerNamespace.on('connection', socket => {
	console.log('SOCKET - A user connected to analyzer:', socket.id)
	// Handle analyzer requests
	aiCompletion.handleAnalyzer(socket, openai)
	socket.on('disconnect', () => {
		console.log('SOCKET - A user disconnected from analyzer:', socket.id)
	})
})
preCallNamespace.on('connection', socket => {
	console.log('SOCKET - A user connected to pre-call:', socket.id)
	aiCompletion.handlePrecall(socket, openai)
	socket.on('disconnect', () => {
		console.log('SOCKET - A user disconnected from pre-call:', socket.id)
	})
})
completionNamespace.on('connection', socket => {
	console.log('SOCKET - A user connected to completion:', socket.id)

	// Handle AI completion requests
	aiCompletion.handleCompletion(socket, openai)

	socket.on('disconnect', () => {
		console.log('SOCKET - A user disconnected:', socket.id)
	})
})

const PORT = process.env.PORT || 2512
server.listen(PORT, () => {
	console.log(`Server: System => Started on :${PORT}`)
})
