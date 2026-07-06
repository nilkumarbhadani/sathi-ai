/**
 * quizAgent.js — The "Test Me" Agent
 *
 * WHY THIS AGENT EXISTS:
 * Active recall through quizzing is one of the most effective study
 * techniques. When the orchestrator detects that a student wants to be
 * tested (intent = "quiz"), it delegates to this specialist agent.
 *
 * Unlike the tutor agent which returns free-form Hinglish text, the
 * quiz agent returns structured JSON so the frontend can render an
 * interactive quiz UI with selectable options, score tracking, and
 * per-question explanations.
 *
 * SINGLE RESPONSIBILITY: Take a subject + topic → return exactly 5
 * well-formed multiple-choice questions as a parsed JSON array.
 */

const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// System instruction that constrains the model to output only a JSON array.
// The expected shape per item: { question, options, correctIndex, explanation }.
const QUIZ_SYSTEM_INSTRUCTION =
    "You are Sathi AI's Quiz Agent. Generate 5 multiple choice questions " +
    "in Hinglish about the given topic. Return ONLY valid JSON array, " +
    "no markdown, no extra text, format: [{question, options: [4 strings], " +
    "correctIndex, explanation}]";

/**
 * Generates a 5-question multiple-choice quiz for the given subject and topic.
 *
 * @param {string} subject - Broad subject area (e.g. "Physics", "History").
 * @param {string} topic   - Specific topic within the subject (e.g. "Newton's Laws").
 * @returns {Promise<Array>} - Parsed JSON array of 5 quiz objects, each containing:
 *   { question: string, options: string[4], correctIndex: number, explanation: string }
 */
async function generateQuiz(subject, topic) {
    const prompt = `Subject: ${subject}\nTopic: ${topic}\n\nGenerate the quiz now.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: QUIZ_SYSTEM_INSTRUCTION,
            // Force the model to respond with valid JSON — this eliminates the
            // common failure mode of markdown-wrapped or explanation-prefixed output.
            responseMimeType: "application/json",
            temperature: 0.8, // Slightly higher for question variety
        }
    });

    // Parse the JSON response. The responseMimeType guarantee means this
    // should always succeed, but we still handle edge cases gracefully.
    const rawText = response.text.trim();
    const questions = JSON.parse(rawText);

    // Validate that we received an array (defensive check).
    if (!Array.isArray(questions)) {
        throw new Error('Quiz generation did not return an array.');
    }

    return questions;
}

module.exports = { generateQuiz };
