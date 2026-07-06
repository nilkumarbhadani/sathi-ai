/**
 * plannerAgent.js — The "What Should I Study Today?" Agent
 *
 * WHY THIS AGENT EXISTS:
 * Students often feel overwhelmed deciding what to study next, especially
 * when juggling multiple subjects. The planner agent eliminates decision
 * fatigue by analyzing their actual progress data and recommending what
 * to focus on today — with specific chapters, priorities, and encouragement.
 *
 * It receives the same subjects array shape used in store.js, making it
 * a drop-in consumer of the frontend's state. The orchestrator routes
 * here when the intent is "planner" (e.g. "aaj kya padhu?").
 *
 * SINGLE RESPONSIBILITY: Take the student's progress data → return a
 * personalized, encouraging, Hinglish study plan for today.
 */

const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// System instruction that tells the model to act as a study planner.
// It should read the progress data, identify weak spots, and suggest
// what to study today in a specific, motivating, Hinglish style.
const PLANNER_SYSTEM_INSTRUCTION =
    "You are Sathi AI's Study Planner. Based on the student's subject " +
    "progress data, suggest in Hinglish what they should study today and " +
    "why. Be specific and encouraging.";

/**
 * Generates a personalized study suggestion based on the student's progress.
 *
 * @param {Array} subjectsData - Array of subject objects matching the store.js shape:
 *   [{
 *     name: string,       — Subject name (e.g. "Mathematics")
 *     progress: number,   — Overall completion percentage (0-100)
 *     chapters: number,   — Total number of chapters in the subject
 *     completed: number   — Number of chapters the student has completed
 *   }]
 * @returns {Promise<string>} - A Hinglish study plan / suggestion as plain text.
 */
async function suggestPlan(subjectsData) {
    // Serialize the progress data into a readable format for the model.
    // Providing it as structured text helps the LLM reason about relative
    // progress across subjects and identify where the student is behind.
    const progressSummary = subjectsData.map(subject =>
        `- ${subject.name}: ${subject.completed}/${subject.chapters} chapters done (${subject.progress}% complete)`
    ).join('\n');

    const prompt =
        `Here is the student's current progress across subjects:\n\n` +
        `${progressSummary}\n\n` +
        `Based on this data, suggest what they should study today and why.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: PLANNER_SYSTEM_INSTRUCTION,
            temperature: 0.7, // Balanced — specific enough to be useful, warm enough to motivate
        }
    });

    return response.text;
}

module.exports = { suggestPlan };
