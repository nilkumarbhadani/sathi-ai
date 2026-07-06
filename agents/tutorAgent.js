/**
 * tutorAgent.js — The "Explain It To Me" Agent
 *
 * WHY THIS AGENT EXISTS:
 * In the orchestrator pattern, every intent gets its own specialist.
 * The tutor agent handles the most common intent — when a student has
 * a doubt, wants a concept explained, or is simply curious about a topic.
 *
 * This agent is intentionally identical to the original /api/chat logic
 * in server.js. By extracting it here, the server becomes a thin router
 * that delegates to the right agent based on classifyIntent(), while
 * each agent owns its own system instruction and response strategy.
 *
 * SINGLE RESPONSIBILITY: Take a user message + chat history → return
 * a clear, motivating, Hinglish explanation of the concept.
 */

const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// The exact same system instruction used by /api/chat in server.js.
// Keeping it as a named constant makes it easy to audit and update.
const TUTOR_SYSTEM_INSTRUCTION =
    "You are Sathi AI, a Universal AI Tutor. You speak in friendly Hinglish " +
    "(Hindi + English). You are highly motivating, use emojis, and help " +
    "students understand concepts easily across any domain or stream.";

/**
 * Explains a concept to the student using conversational Hinglish.
 *
 * @param {string} message  - The student's current question or doubt.
 * @param {Array}  history  - Prior conversation turns, each { role, text }.
 *                            Mirrors the shape sent by the frontend to /api/chat.
 * @returns {Promise<string>} - The tutor's Hinglish explanation.
 */
async function explainConcept(message, history = []) {
    // Build the contents array in the exact same way as the /api/chat endpoint.
    // Each prior turn is mapped to { role: 'user' | 'model', parts: [{ text }] }.
    const contents = [];

    if (history && history.length > 0) {
        history.forEach(msg => {
            contents.push({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }]
            });
        });
    }

    // Append the current user message as the final turn.
    contents.push({
        role: 'user',
        parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: {
            systemInstruction: TUTOR_SYSTEM_INSTRUCTION,
            temperature: 0.7, // Same creative-but-focused temperature as /api/chat
        }
    });

    return response.text;
}

module.exports = { explainConcept };
