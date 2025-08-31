// services/answers.js
// Robust grading utilities: single/multi + mismatch detection

const toId = v => {
	if (v == null) return ''
	if (typeof v === 'object') {
		if (v._id && typeof v._id.toString === 'function') return v._id.toString()
		if (typeof v.toString === 'function') return v.toString()
	}
	return String(v)
}

const norm = s => (s == null ? '' : String(s).trim().toLowerCase())

const getAnswerText = opt => {
	// adapt ke skema lo: cobain beberapa field umum
	return (
		opt?.text ??
		opt?.label ??
		opt?.value ?? // hati-hati: di banyak skema ini "teks" opsi
		opt?.content ??
		''
	)
}

export const getCorrectOptionIds = question => {
	if (!question || !Array.isArray(question.answers)) return []
	return question.answers.filter(a => a?.is_correct).map(a => toId(a.id_answer))
}

export const getOptionById = (question, id) => {
	if (!question || !Array.isArray(question.answers)) return null
	const sid = toId(id)
	return question.answers.find(a => toId(a?.id_answer) === sid) || null
}

export const getOptionByText = (question, text) => {
	if (!question || !Array.isArray(question.answers)) return null
	const t = norm(text)
	return question.answers.find(a => norm(getAnswerText(a)) === t) || null
}

const sameIdSet = (a, b) => {
	if (a.length !== b.length) return false
	const sb = new Set(b)
	for (const x of a) if (!sb.has(x)) return false
	return true
}

/**
 * Grade and audit a user's answer.
 * Returns labels from DB (never trust client text),
 * and flags mismatches (id ↔ text).
 */
export const gradeAnswer = (question, answer) => {
	const correctIds = getCorrectOptionIds(question)

	// Build chosen options from id/text
	let chosenOpts = []
	let mismatch = false
	let invalid = false

	if (answer && typeof answer === 'object' && 'id_answer' in answer) {
		// array => multi-select, scalar => single-select
		const raw = Array.isArray(answer.id_answer) ? answer.id_answer : [answer.id_answer]

		for (const r of raw) {
			const byId = getOptionById(question, r)
			if (!byId) {
				invalid = true // id tidak valid untuk soal ini
				continue
			}
			// if client also sent a text value for this single-select scenario, try detect mismatch
			// (untuk multi, biasanya client gak kirim text tunggal; biarin aja)
			if (!Array.isArray(answer.id_answer) && typeof answer.value !== 'undefined') {
				const txt = norm(answer.value)
				const dbTxt = norm(getAnswerText(byId))
				if (txt && dbTxt && txt !== dbTxt) mismatch = true
			}
			chosenOpts.push(byId)
		}
	} else if (typeof answer?.value !== 'undefined') {
		// No id provided, only text → fallback cari by text
		const byText = getOptionByText(question, answer.value)
		if (!byText) {
			invalid = true // text gak ketemu di opsi
		} else {
			chosenOpts = [byText]
		}
	} else {
		invalid = true // no usable payload
	}

	// Normalize chosen ids/labels (from DB)
	const chosenIds = chosenOpts.map(o => toId(o?.id_answer)).filter(Boolean)
	const chosenLabels = chosenOpts.map(o => getAnswerText(o))

	// Decide correctness
	let isCorrect = false
	if (chosenIds.length > 0) {
		// Strategy: exact set match
		isCorrect = sameIdSet(chosenIds, correctIds)
	}

	// If we detected mismatch/invalid payload, force isCorrect = false
	if (mismatch || invalid) isCorrect = false

	// Build correct labels (from DB)
	const correctLabels = correctIds
		.map(id => getOptionById(question, id))
		.filter(Boolean)
		.map(getAnswerText)

	return {
		isCorrect,
		chosenIds,
		chosenLabels,
		correctIds,
		correctLabels,
		mismatch,
		invalid,
	}
}
