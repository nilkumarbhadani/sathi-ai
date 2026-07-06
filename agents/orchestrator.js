const { GoogleGenAI } = require('@google/genai');
// Load dotenv to support direct usage or testing of this module
require('dotenv').config();

// Initialize the GoogleGenAI client using the API key loaded from environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Classifies a user's input message into one of three specific intents:
 * - "tutor": The user wants a concept explained, has a doubt, or wants to learn something.
 * - "quiz": The user wants to be quizzed, tested, or challenged with questions.
 * - "planner": The user wants study recommendations, suggestions, or plan advice.
 *
 * It uses the 'gemini-2.5-flash' model with a system instruction and a structured
 * output schema to guarantee a response containing exactly one of the three options.
 *
 * @param {string} message - The input message from the user.
 * @returns {Promise<string>} - Resolves to "tutor", "quiz", or "planner".
 */
async function classifyIntent(message) {
    if (!message || typeof message !== 'string') {
        // Default fallback to "tutor" if input is invalid
        return 'tutor';
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: message,
            config: {
                // The system instruction defines the rules for classification.
                // It helps Gemini map user query semantics to the correct intent label.
                systemInstruction: `You are an intent classification assistant. 
Your sole job is to classify the user's message into exactly one of these categories:
- "tutor" - The user wants a concept explained, has a doubt, wants to learn, or asks a subject matter question.
- "quiz" - The user wants to be quizzed, tested, or checked for knowledge.
- "planner" - The user wants study suggestions, roadmap, tips on what to study, or asks questions like "what to study today".

You must output exactly one of: "tutor", "quiz", or "planner".`,
                
                // Enforce structured output via JSON Schema containing only the predefined enums.
                // This ensures Gemini only yields one of the three desired strings as valid JSON output.
                responseMimeType: "application/json",
                responseSchema: {
                    type: "STRING",
                    enum: ["tutor", "quiz", "planner"]
                },
                
                // Set temperature to 0 for highly deterministic, fast classification.
                temperature: 0.0,
            }
        });

        // The response.text is guaranteed to be a JSON string like `"tutor"`, `"quiz"`, or `"planner"`.
        // We trim and parse it to retrieve the pure string value.
        if (response && response.text) {
            const parsedIntent = JSON.parse(response.text.trim());
            if (['tutor', 'quiz', 'planner'].includes(parsedIntent)) {
                return parsedIntent;
            }
        }
        
        return 'tutor'; // Fallback in case of unexpected format
    } catch (error) {
        console.error("Error in classifyIntent:", error);
        // Default fallback to "tutor" to maintain service availability on API/Network failures.
        return 'tutor';
    }
}

module.exports = {
    classifyIntent
};
