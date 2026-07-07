/**
 * tutorAgent.js — The Universal "Explain It To Me" Agent
 *
 * WHY THIS AGENT EXISTS:
 * In the orchestrator pattern, every intent gets its own specialist.
 * The tutor agent handles the most common intent — when a student has
 * a doubt, wants a concept explained, or is simply curious about a topic.
 *
 * This agent is a universal tutor — it auto-detects the subject, topic,
 * difficulty level, and language from the user's message. It supports
 * mixed conversations (e.g., UPSC → recursion → poetry) without resetting
 * context. Responses are formatted in rich markdown.
 *
 * SINGLE RESPONSIBILITY: Take a user message + chat history → return
 * a clear, motivating, well-formatted explanation of any concept.
 */

const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Universal system instruction — no subject bias, auto-detection of everything.
const TUTOR_SYSTEM_INSTRUCTION =
    `You are Sathi AI, a Universal AI Tutor and friendly study buddy.

CORE BEHAVIOR:
- You speak in friendly Hinglish (Hindi + English) by default, but adapt to the user's language.
- You are highly motivating, use emojis naturally, and make learning fun.
- You help students understand concepts across ANY subject, domain, or stream.
- You automatically detect the subject, topic, difficulty level, and preferred language from context.

WHAT YOU CAN HELP WITH:
- Any academic subject (Mathematics, Science, History, Geography, Computer Science, etc.)
- Competitive exam preparation (UPSC, JEE, NEET, GATE, CAT, SSC, etc.)
- Coding and programming (Python, JavaScript, C++, Data Structures, Algorithms, etc.)
- Career guidance, interview preparation, writing skills, reasoning, general knowledge
- Humanities, Arts, Commerce, Engineering — everything

RESPONSE FORMATTING:
- Use markdown formatting for rich responses:
  - **Bold** for key terms and important concepts
  - Use headings (## and ###) to organize long explanations
  - Use bullet points and numbered lists for steps or key points
  - Use code blocks (\`\`\`language) for code examples
  - Use tables when comparing things
  - Use blockquotes for important notes or formulas
  - Use horizontal rules (---) to separate major sections
- Keep explanations clear, structured, and easy to follow
- Include exam-relevant tips where applicable

VARIETY:
- Vary your response style — don't use the same structure every time
- Mix analogies, examples, stories, comparisons, and direct explanations
- Adapt complexity to the student's apparent level

CONVERSATION RULES:
- Maintain full context across topic switches (e.g., from UPSC to recursion)
- Never reset or forget previous conversation context
- Never start explaining a predefined topic on your own
- Only respond to what the user asks
- If the user's question is vague, ask a clarifying question
- Be concise but thorough — don't over-explain simple things`;

/**
 * Classifies an API error into a user-friendly message.
 * @param {Error} error - The caught error
 * @returns {string} - A user-friendly error message
 */
function classifyError(error) {
    const msg = error.message || '';
    const status = error.status || 0;

    if (status === 429 || msg.includes('429') || msg.includes('quota') || msg.includes('rate')) {
        return 'Thoda ruko yaar! 😅 Rate limit hit ho gaya. 30 seconds baad dobara try karo.';
    }
    if (status === 401 || status === 403 || msg.includes('API key') || msg.includes('permission')) {
        return 'API key mein koi issue hai. Admin se contact karo. 🔑';
    }
    if (msg.includes('network') || msg.includes('ECONNREFUSED') || msg.includes('ETIMEDOUT') || msg.includes('fetch')) {
        return 'Internet connection mein issue lag raha hai. Apna connection check karo! 🌐';
    }
    if (msg.includes('empty') || msg.includes('no response')) {
        return 'Gemini se response nahi aaya. Dobara try karo! 🔄';
    }
    return 'Kuch technical issue aa gaya. Thodi der baad try karo! 🛠️';
}

/**
 * Explains a concept to the student using conversational Hinglish.
 *
 * @param {string} message  - The student's current question or doubt.
 * @param {Array}  history  - Prior conversation turns, each { role, text }.
 * @returns {Promise<string>} - The tutor's formatted explanation.
 */
async function explainConcept(message, history = []) {
    const contents = [];

    if (history && history.length > 0) {
        history.forEach(msg => {
            // Ensure text is always a string to prevent API errors
            const safeText = (typeof msg.text === 'string') ? msg.text : String(msg.text || '');
            if (safeText.trim()) {
                contents.push({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: safeText }]
                });
            }
        });
    }

    contents.push({
        role: 'user',
        parts: [{ text: message }]
    });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: {
                systemInstruction: TUTOR_SYSTEM_INSTRUCTION,
                temperature: 0.7, // Balanced — creative enough for engaging explanations
            }
        });

        if (!response || !response.text) {
            return 'Gemini se response nahi aaya. Dobara try karo! 🔄';
        }

        return response.text;
    } catch (error) {
        console.error('TutorAgent Error:', error.message || error);
        return classifyError(error);
    }
}

module.exports = { explainConcept };
