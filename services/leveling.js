// services/leveling.js
/**
 * Utilities for adaptive level selection based on correctness
 * ensuring the next question number exists at the chosen level.
 */

/**
 * Check if a given level contains target question number in the payload
 * @param {Array} payload - [{ level:Number, questions:[{no:Number, ...}], ... }]
 * @param {Number} level
 * @param {Number} questionNo
 * @returns {Boolean}
 */
export const levelHasQuestion = (payload, level, questionNo) => {
	if (!Array.isArray(payload)) return false
	const pack = payload.find(p => p.level === level)
	if (!pack || !Array.isArray(pack.questions)) return false
	return pack.questions.some(q => q.no === questionNo)
}

/**
 * Return a sorted list of all levels that have the given question number
 * @param {Array} payload
 * @param {Number} questionNo
 * @returns {Number[]}
 */
export const levelsWithQuestion = (payload, questionNo) => {
	if (!Array.isArray(payload)) return []
	return payload
		.filter(p => Array.isArray(p.questions) && p.questions.some(q => q.no === questionNo))
		.map(p => p.level)
		.sort((a, b) => a - b)
}

/**
 * Choose the next level when the previous answer is CORRECT.
 * Rule: try to go up (+1). If the next question doesn't exist there,
 * keep scanning upward. If still none, fallback to same level (if exists),
 * otherwise choose the closest level below that has the question.
 *
 * @param {Object} params
 * @param {Array} params.payload
 * @param {Number} params.currentLevel
 * @param {Number} params.nextQuestionNo
 * @param {Number} params.levelCount
 * @returns {Number} chosenLevel
 */
export const chooseLevelOnCorrect = ({ payload, currentLevel, nextQuestionNo, levelCount }) => {
	// Prefer upward levels first
	for (let lvl = Math.min(currentLevel + 1, levelCount); lvl <= levelCount; lvl++) {
		if (levelHasQuestion(payload, lvl, nextQuestionNo)) return lvl
	}
	// Fallback to same level if it has the question
	if (levelHasQuestion(payload, currentLevel, nextQuestionNo)) return currentLevel
	// Then try downward to nearest available
	for (let lvl = currentLevel - 1; lvl >= 1; lvl--) {
		if (levelHasQuestion(payload, lvl, nextQuestionNo)) return lvl
	}
	// Absolute fallback: pick any available level (first in ascending order) or 1
	const any = levelsWithQuestion(payload, nextQuestionNo)
	return any.length ? any[0] : 1
}

/**
 * Choose the next level when the previous answer is WRONG.
 * Rule: if not on level 1, go down (-1) and keep going down until the next
 * question exists. If none below, keep current if it has the question,
 * otherwise pick the lowest level that has it (to honor "turunin" as much as possible).
 *
 * @param {Object} params
 * @param {Array} params.payload
 * @param {Number} params.currentLevel
 * @param {Number} params.nextQuestionNo
 * @param {Number} params.levelCount
 * @returns {Number} chosenLevel
 */

export const chooseLevelOnWrong = ({ payload, currentLevel, nextQuestionNo, levelCount }) => {
	// If we're above level 1, try to go down until exists
	for (let lvl = currentLevel - 1; lvl >= 1; lvl--) {
		if (levelHasQuestion(payload, lvl, nextQuestionNo)) return lvl
	}
	// If nothing below works, but current has it, stay (no lower available)
	if (levelHasQuestion(payload, currentLevel, nextQuestionNo)) return currentLevel
	// Otherwise pick the lowest level that has the question (closest to "turunin")
	const any = levelsWithQuestion(payload, nextQuestionNo)
	return any.length ? any[0] : 1
}

/**
 * Decide next level based on correctness with existence checks.
 * Handles single-level tests gracefully.
 *
 * @param {Object} params
 * @param {Array} params.payload
 * @param {Number} params.currentLevel
 * @param {Number} params.nextQuestionNo
 * @param {Number} params.levelCount
 * @param {Boolean} params.isCorrect
 * @returns {Number} nextLevel
 */

export const findQuestionInLevel = (payload, level, no) => {
	if (!Array.isArray(payload)) return null
	const pack = payload.find(p => p.level === level)
	if (!pack || !Array.isArray(pack.questions)) return null
	return pack.questions.find(q => q.no === no) || null
}

export const getNextLevel = ({ payload, currentLevel, nextQuestionNo, levelCount, isCorrect }) => {
	// If only one level, always 1
	if (!levelCount || levelCount <= 1) return 1

	if (isCorrect) {
		return chooseLevelOnCorrect({ payload, currentLevel, nextQuestionNo, levelCount })
	}
	// Wrong answer
	if (currentLevel <= 1) {
		// On level 1 and wrong => try to keep 1 if question exists; else find any available (lowest first)
		if (levelHasQuestion(payload, 1, nextQuestionNo)) return 1
		const any = levelsWithQuestion(payload, nextQuestionNo)
		return any.length ? any[0] : 1
	}
	return chooseLevelOnWrong({ payload, currentLevel, nextQuestionNo, levelCount })
}
