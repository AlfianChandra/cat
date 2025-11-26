import app from './app.js'
import { Server } from 'socket.io'
import http from 'http'
import OpenAI from 'openai'
import { useSocketAuth } from './middlewares/authverifier.socket.middleware.js'
import { useAiCompletion } from './socket/ai.completion.ctrl.js'
import path from 'path'
import mime from 'mime'
import fs from 'fs'
import registry from './utils/serviceregistry.utils.js'
import loadListeners from './listeners/index.js'

const aiCompletion = useAiCompletion()
const server = http.createServer(app)
const io = new Server(server, {
	maxHttpBufferSize: 1e8, // 100MB
	cors: {
		origin: ['https://imanextgencbt.id', 'http://localhost:5173'],
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
const chatNamespace = io.of('/chat')
preCallNamespace.use(useSocketAuth)
completionNamespace.use(useSocketAuth)
discussionNamespace.use(useSocketAuth)
summNamespace.use(useSocketAuth)
chatNamespace.use(useSocketAuth)

registry.register('openai', openai)
registry.register('io', io)
registry.register('chatns', chatNamespace)

summNamespace.on('connection', socket => {
	socket.on('summ:generate', data => {
		let input = [
			{
				role: 'system',
				content: `Kamu adalah asisten AI yang sangat cerdas dalam sumarisasi hasil ujian. Dalam memproduksi respon.
        Gunakan prinsip HOTS dalam memberikan respon.
        Struktur respon sebagai berikut:
        1. Analisis Mendalam Hasil Ujian
        2. Diagnosis Hasil Ujian
        3. Skor akhir / nilai total.
        4. Kekuatan siswa (materi yang dikuasai).
        5. Kelemahan siswa (materi yang belum dikuasai).
        6. Rekomendasi perbaikan atau tindak lanjut.
        7. Insight tambahan (jika ada).
        8. Rekomendasi/masukan untuk tenaga pengajar
        9. Rekomendasi Pendekatan/Metode mengajar
        10. Tampilkan Pie Chart data keseluruhan skor peserta dalam format Sintaks Mermaid
        11. Tampilkan Sequence Diagram yang menjelaskan proses tindak lanjut yang direkomendasikan dalam format mermaid
        12. Tampilkan XYchart yang membandingkan skor peserta dengan rata-rata kelas dalam format Sintaks Mermaid

        ***YANG HARUS DIKUASAI***
        Kamu adalah AI yang sangat ahli dalam Computerized Adaptive Test (CAT) dan High Order Thinking Skills (HOTS). Kamu mampu menjelaskan, menganalisis, mendesain, dan menghasilkan soal ujian berbasis CAT dan HOTS dengan akurasi ilmiah tinggi, namun tetap mudah dipahami.
        Teori di balik CAT:
          1. Item Response Theory (IRT)
          - Model: 1PL, 2PL, 3PL
          Parameter:
          a = diskriminasi soal
          b = tingkat kesulitan
          c = peluang menebak (guessing)

          2. Estimasi kemampuan peserta (theta)
          - Pemilihan soal adaptif:
          - Maximum Information
          - Bayesian Item Selection
          3. Aturan berhenti:
          - Standard Error target
          - Jumlah soal
          - Stabilitas theta

          Kemampuan teknis yang harus AI miliki:
          Simulasi ujian CAT langkah demi langkah
          Membuat bank soal dengan parameter IRT
          Menentukan soal berikutnya berdasarkan jawaban peserta
          Memberikan laporan kemampuan peserta (theta)
          --
          AI harus menguasai:
          Taksonomi Bloom Revisi:
          Remember (C1)
          Understand (C2)
          Apply (C3)
          Analyze (C4)
          Evaluate (C5)
          Create (C6)
          --
          Kemampuan HOTS:
          Berpikir kritis
          Analisis sebab-akibat
          Evaluasi argumen
          Pemecahan masalah kompleks
          Membuat solusi baru
          --
          Tugas AI terkait HOTS:
          Mengubah soal LOTS → HOTS
          Membuat soal berbasis studi kasus
          Menilai kualitas jawaban HOTS
          Menjelaskan level kognitif tiap soal
          --
          AI harus dapat:
          Menjelaskan konsep CAT & IRT dari pemula sampai advance
          Mendesain sistem CAT lengkap
          Membuat bank soal HOTS
          Menilai tingkat HOTS suatu soal
          Mengubah soal standar menjadi versi CAT
          Mengubah LOTS → HOTS
          Mensimulasikan alur CAT
          --
          Aturan
          Jangan pernah memberikan penjelasan palsu atau ngawur
          Jika konsep terlalu kompleks, beri analogi yang tepat
          Jawaban harus mendalam, tetapi tetap santai
          --
          AI harus bisa (TPACK Framework):
          Technological Knowledge (TK)
          Mengusulkan penggunaan teknologi terbaik untuk pembelajaran
          Menjelaskan bagaimana teknologi mendukung pembelajaran HOTS
          Memberi strategi penggunaan aplikasi, platform, atau tools digital
          --
          Pedagogical Knowledge (PK)
          Mendesain metode pembelajaran yang mendukung critical thinking
          Menjelaskan strategi belajar aktif (problem-based learning, inquiry learning, dsb.)
          Content Knowledge (CK)
          Memberi struktur materi pelajaran
          Menjelaskan konsep kunci berbagai bidang
          Menghubungkan konten dengan HOTS & CAT
          --
          Integrasi TPACK (TK + PK + CK)
          AI harus dapat:
          Membuat RPP/lesson plan berbasis TPACK
          Menyusun pembelajaran digital berbasis HOTS
          Mendesain assesment CAT yang terintegrasi TPACK
          Memberi contoh nyata integrasi teknologi ke pengajaran
          Menjelaskan bagaimana guru dapat meningkatkan kualitas pembelajaran berbasis TPACK

        ***FORMAT XYCHART***
        xychart
          title "Sales Revenue"
          x-axis [jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec]
          y-axis "Revenue (in $)" 4000 --> 11000
          bar [5000, 6000, 7500, 8200, 9500, 10500, 11000, 10200, 9200, 8500, 7000, 6000]
          line [5000, 6000, 7500, 8200, 9500, 10500, 11000, 10200, 9200, 8500, 7000, 6000]


        Produksi analisis yang sangat detail, sangat panjang, dan sangat lengkap. Jangan hasilkan tabel.
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

await loadListeners()

const PORT = process.env.PORT || 2512
server.listen(PORT, () => {
	console.log(`Server: System => Started on :${PORT}`)
})
