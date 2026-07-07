/**
 * quizAgent.js — The Universal "Test Me" Agent + Flashcard Generator
 *
 * WHY THIS AGENT EXISTS:
 * Active recall through quizzing is one of the most effective study
 * techniques. This agent generates quizzes and flashcards on ANY topic,
 * at any difficulty level — entirely powered by Gemini.
 * No local question banks, no predefined subjects.
 *
 * RESPONSIBILITIES:
 * 1. generateQuiz(topic, difficulty, numQuestions) → structured quiz JSON with retry + validation
 * 2. generateFlashcards(topic) → array of { term, explanation } flashcard pairs
 */

const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MAX_RETRIES = 3;

/**
 * Classifies an API error into a user-friendly message.
 */
function classifyError(error) {
    const msg = error.message || '';
    const status = error.status || 0;

    if (status === 429 || msg.includes('429') || msg.includes('quota') || msg.includes('rate')) {
        return 'Rate limit reached. Please wait a moment and try again.';
    }
    if (status === 401 || status === 403 || msg.includes('API key') || msg.includes('permission')) {
        return 'API key issue. Please check configuration.';
    }
    if (msg.includes('network') || msg.includes('ECONNREFUSED') || msg.includes('ETIMEDOUT') || msg.includes('fetch')) {
        return 'Network connection issue. Please check your internet.';
    }
    if (msg.includes('empty') || msg.includes('no response')) {
        return 'Gemini returned an empty response. Please try again.';
    }
    return 'Unable to generate quiz right now. Please try again.';
}

/**
 * Builds the system instruction for quiz generation.
 */
function buildQuizSystemInstruction(topic, difficulty, numQuestions) {
    const conciseNote = numQuestions >= 20
        ? '\nIMPORTANT: Keep questions and explanations concise (1-2 sentences each) to stay within response limits.'
        : '';

    return `You are Sathi AI's Quiz Generator. You generate high-quality multiple-choice quizzes on ANY subject or topic.

TASK: Generate exactly ${numQuestions} multiple-choice questions about "${topic}" at ${difficulty} difficulty level.

RULES:
1. Each question must have exactly 4 options.
2. Exactly one option must be correct per question.
3. RANDOMIZE the position of the correct answer — do NOT always place it at the same index. Distribute correct answers across indices 0, 1, 2, 3.
4. Make questions unique and varied — cover different aspects of the topic. No duplicate questions.
5. All 4 options within each question must be distinct — no duplicate options.
6. Questions should be in Hinglish (Hindi + English mix) style.
7. Each question must include a clear explanation of WHY the correct answer is correct.
8. Avoid repetitive wording across questions. Each question should test a different aspect of the topic.
9. Vary question types: definitions, applications, comparisons, scenario-based, true/false conversions, etc.
10. Difficulty levels:
   - Easy: Basic recall, definitions, simple facts
   - Medium: Application, understanding, connections between concepts
   - Hard: Analysis, evaluation, tricky edge cases, advanced concepts
11. Generate questions that are educational and exam-relevant.${conciseNote}

CRITICAL: Return ONLY valid JSON. No markdown, no extra text, no code fences. Just the raw JSON object.

The JSON must follow this EXACT format:
{
  "topic": "${topic}",
  "difficulty": "${difficulty}",
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Explanation of why this is correct."
    }
  ]
}

Where "correctAnswer" is the 0-based index of the correct option in the "options" array.`;
}

/**
 * Validates the quiz JSON structure with comprehensive checks.
 * @param {object} quiz - The parsed quiz object.
 * @returns {{ valid: boolean, error: string|null }}
 */
function validateQuizJSON(quiz) {
    if (!quiz || typeof quiz !== 'object') {
        return { valid: false, error: 'Response is not an object' };
    }
    if (!quiz.questions || !Array.isArray(quiz.questions)) {
        return { valid: false, error: 'Missing or invalid "questions" array' };
    }
    if (quiz.questions.length === 0) {
        return { valid: false, error: 'Questions array is empty' };
    }

    const seenQuestions = new Set();

    for (let i = 0; i < quiz.questions.length; i++) {
        const q = quiz.questions[i];

        // Check required fields
        if (!q.question || typeof q.question !== 'string' || q.question.trim().length < 10) {
            return { valid: false, error: `Question ${i + 1}: missing or too short question text` };
        }
        if (!Array.isArray(q.options) || q.options.length !== 4) {
            return { valid: false, error: `Question ${i + 1}: must have exactly 4 options` };
        }
        if (typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer > 3) {
            return { valid: false, error: `Question ${i + 1}: invalid "correctAnswer" index` };
        }
        if (!q.explanation || typeof q.explanation !== 'string' || q.explanation.trim().length === 0) {
            return { valid: false, error: `Question ${i + 1}: missing "explanation"` };
        }

        // Check options are non-empty strings
        for (let j = 0; j < q.options.length; j++) {
            if (!q.options[j] || typeof q.options[j] !== 'string' || q.options[j].trim().length === 0) {
                return { valid: false, error: `Question ${i + 1}, Option ${j + 1}: empty or invalid` };
            }
        }

        // Check for duplicate options within the question (case-insensitive)
        const optSet = new Set(q.options.map(o => o.trim().toLowerCase()));
        if (optSet.size !== 4) {
            return { valid: false, error: `Question ${i + 1}: has duplicate options` };
        }

        // Check for duplicate questions across the quiz
        const qKey = q.question.trim().toLowerCase().substring(0, 60);
        if (seenQuestions.has(qKey)) {
            return { valid: false, error: `Question ${i + 1}: appears to be a duplicate` };
        }
        seenQuestions.add(qKey);
    }

    return { valid: true, error: null };
}

/**
 * Generates a quiz with retry logic and schema validation.
 *
 * @param {string} topic        - Any topic (e.g., "Python", "Newton's Laws", "Indian Constitution")
 * @param {string} difficulty   - "Easy", "Medium", or "Hard"
 * @param {number} numQuestions - Number of questions (5, 10, 15, or 20)
 * @returns {Promise<object>}   - Validated quiz JSON or error object
 */
async function generateQuiz(topic, difficulty = 'Medium', numQuestions = 5) {
    const systemInstruction = buildQuizSystemInstruction(topic, difficulty, numQuestions);
    const prompt = `Generate a ${difficulty} difficulty quiz with ${numQuestions} questions about: ${topic}`;

    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`🎯 QuizAgent: Attempt ${attempt}/${MAX_RETRIES} for topic="${topic}", difficulty=${difficulty}, count=${numQuestions}`);

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    systemInstruction: systemInstruction,
                    responseMimeType: "application/json",
                    temperature: 0.5, // Lower for consistent, accurate MCQs
                }
            });

            if (!response || !response.text) {
                lastError = `Attempt ${attempt}: Gemini returned an empty response`;
                console.error(`❌ QuizAgent: ${lastError}`);
                continue;
            }

            const rawText = response.text.trim();
            let quiz;

            try {
                quiz = JSON.parse(rawText);
            } catch (parseErr) {
                lastError = `Attempt ${attempt}: JSON parse failed — ${parseErr.message}`;
                console.error(`❌ QuizAgent: ${lastError}`);
                continue;
            }

            // Validate structure
            const validation = validateQuizJSON(quiz);
            if (!validation.valid) {
                lastError = `Attempt ${attempt}: Validation failed — ${validation.error}`;
                console.error(`❌ QuizAgent: ${lastError}`);
                continue;
            }

            // Ensure topic and difficulty are set
            quiz.topic = quiz.topic || topic;
            quiz.difficulty = quiz.difficulty || difficulty;

            console.log(`✅ QuizAgent: Successfully generated ${quiz.questions.length} questions`);
            return quiz;

        } catch (apiErr) {
            lastError = classifyError(apiErr);
            console.error(`❌ QuizAgent: Attempt ${attempt}: ${apiErr.message || apiErr}`);
        }
    }

    // All retries failed
    console.error(`🚫 QuizAgent: All ${MAX_RETRIES} attempts failed. Last error: ${lastError}`);
    return {
        error: true,
        message: lastError || 'Unable to generate quiz right now. Please try again.'
    };
}

/**
 * Generates AI-powered flashcards for a given topic.
 *
 * @param {string} topic - Any topic (e.g., "Quantum Physics", "JavaScript Closures")
 * @returns {Promise<object>} - { cards: [{ term, explanation }] } or error object
 */
async function generateFlashcards(topic) {
    const systemInstruction = `You are Sathi AI's Flashcard Generator. Generate exactly 10 flashcard pairs for studying "${topic}".

Each flashcard has:
- "term": A key concept, question, or term to test (short, 1-2 sentences max)
- "explanation": A clear, concise explanation in Hinglish style (2-4 sentences)

Rules:
- Cover different aspects of the topic
- Make terms specific and testable
- Explanations should be educational and memorable
- Use emojis sparingly for engagement
- No duplicate terms

Return ONLY valid JSON in this format:
{
  "topic": "${topic}",
  "cards": [
    { "term": "...", "explanation": "..." }
  ]
}`;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`🎴 FlashcardAgent: Attempt ${attempt}/${MAX_RETRIES} for topic="${topic}"`);

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Generate 10 flashcards about: ${topic}`,
                config: {
                    systemInstruction: systemInstruction,
                    responseMimeType: "application/json",
                    temperature: 0.6,
                }
            });

            if (!response || !response.text) {
                console.error(`❌ FlashcardAgent: Attempt ${attempt}: Empty response`);
                continue;
            }

            const data = JSON.parse(response.text.trim());

            if (!data.cards || !Array.isArray(data.cards) || data.cards.length === 0) {
                console.error(`❌ FlashcardAgent: Attempt ${attempt}: Invalid cards array`);
                continue;
            }

            // Validate each card
            const validCards = data.cards.filter(c =>
                c && typeof c.term === 'string' && c.term.trim().length > 0 &&
                typeof c.explanation === 'string' && c.explanation.trim().length > 0
            );

            if (validCards.length === 0) {
                console.error(`❌ FlashcardAgent: Attempt ${attempt}: No valid cards`);
                continue;
            }

            console.log(`✅ FlashcardAgent: Generated ${validCards.length} flashcards`);
            return { topic: data.topic || topic, cards: validCards };

        } catch (err) {
            console.error(`❌ FlashcardAgent: Attempt ${attempt}: ${err.message || err}`);
        }
    }

    return {
        error: true,
        message: 'Unable to generate flashcards right now. Please try again.'
    };
}

module.exports = { generateQuiz, generateFlashcards };
