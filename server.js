const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { GoogleGenAI } = require('@google/genai');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import the orchestrator and specialist agents
const { classifyIntent } = require('./agents/orchestrator');
const { explainConcept } = require('./agents/tutorAgent');
const { generateQuiz, generateFlashcards } = require('./agents/quizAgent');
const { suggestPlan } = require('./agents/plannerAgent');

const app = express();
const port = process.env.PORT || 3000;

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configure Multer for file uploads (store in memory for direct API transmission)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Helper to convert buffer to generative part format
function bufferToGenerativePart(buffer, mimeType) {
    return {
        inlineData: {
            data: buffer.toString("base64"),
            mimeType
        },
    };
}

// 1. Text Chat Endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { message, history } = req.body;
        
        // Prepare contents array for Gemini
        const contents = [];
        
        // Add system instruction as the first message if needed, or format history
        if (history && history.length > 0) {
            history.forEach(msg => {
                contents.push({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.text }]
                });
            });
        }
        
        contents.push({
            role: 'user',
            parts: [{ text: message }]
        });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: {
                systemInstruction: "You are Sathi AI, a Universal AI Tutor. You speak in friendly Hinglish (Hindi + English). You are highly motivating, use emojis, and help students understand concepts easily across any domain or stream.",
                temperature: 0.7,
            }
        });

        res.json({ response: response.text });
    } catch (error) {
        console.error("Chat Error:", error);
        res.status(500).json({ error: "Failed to generate response." });
    }
});

// 2. Media Analysis Endpoint (Images & PDFs)
app.post('/api/analyze-media', upload.single('media'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded." });
        }

        const prompt = req.body.prompt || "Please analyze this document/image and explain it to me simply in Hinglish.";
        const mimeType = req.file.mimetype;
        const fileBuffer = req.file.buffer;

        // Note: For large PDFs, it's better to use the File API, but for smaller ones/images, inlineData works well in gemini-1.5-flash/pro
        const imagePart = bufferToGenerativePart(fileBuffer, mimeType);

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                {
                    role: 'user',
                    parts: [
                        imagePart,
                        { text: prompt }
                    ]
                }
            ],
            config: {
                 systemInstruction: "You are Sathi AI, a friendly Hinglish AI Tutor. Analyze the provided media and explain it clearly.",
            }
        });

        res.json({ response: response.text });
    } catch (error) {
        console.error("Media Analysis Error:", error);
        res.status(500).json({ error: "Failed to analyze media." });
    }
});

// 3. Orchestrated Agent Endpoint
// Routes the user's message to the right specialist agent (tutor, quiz, or planner)
// based on intent classification from the orchestrator.
app.post('/api/agent', async (req, res) => {
    try {
        const { message, history, subjectsData } = req.body;

        if (!message) {
            return res.status(400).json({ error: "Message is required." });
        }

        // Step 1: Classify the user's intent using the orchestrator
        const intent = await classifyIntent(message);

        let agentResponse;
        let handledBy;

        // Step 2: Route to the matching specialist agent
        switch (intent) {
            case 'tutor':
                console.log('🤖 Orchestrator routed to: TutorAgent');
                handledBy = 'TutorAgent';
                agentResponse = await explainConcept(message, history || []);
                break;

            case 'quiz':
                console.log('🤖 Orchestrator routed to: QuizAgent');
                handledBy = 'QuizAgent';
                // Return a friendly message with the topic extracted from user's message.
                // The frontend will render an interactive quiz button.
                agentResponse = '🎯 **Quiz Time!**\n\nAre wah, quiz dena chahte ho! Bahut achhi baat hai! 💪\n\nNeeche button click karo aur quiz shuru karo!';
                // Attach the user's message as quizTopic so the frontend can
                // pre-fill the quiz page with it.
                res.json({ response: agentResponse, handledBy: handledBy, quizTopic: message });
                return; // Early return — response already sent

            case 'planner':
                console.log('🤖 Orchestrator routed to: PlannerAgent');
                handledBy = 'PlannerAgent';
                // Pass subjects progress data; fall back to empty array if not provided
                agentResponse = await suggestPlan(subjectsData || []);
                break;

            default:
                // Fallback to tutor if orchestrator returns an unexpected value
                console.log('🤖 Orchestrator returned unknown intent, falling back to: TutorAgent');
                handledBy = 'TutorAgent';
                agentResponse = await explainConcept(message, history || []);
                break;
        }

        // Step 3: Return the agent's response along with which agent handled it
        res.json({ response: agentResponse, handledBy: handledBy });
    } catch (error) {
        console.error("Agent Routing Error:", error);
        res.status(500).json({ error: "Failed to process agent request." });
    }
});

// 4. Dedicated Quiz Generation Endpoint
// Used by the redesigned quiz.html to generate quizzes on any topic.
app.post('/api/quiz', async (req, res) => {
    try {
        const { topic, difficulty, numQuestions } = req.body;

        if (!topic || typeof topic !== 'string' || !topic.trim()) {
            return res.status(400).json({ error: 'Topic is required.' });
        }

        const safeDifficulty = ['Easy', 'Medium', 'Hard'].includes(difficulty) ? difficulty : 'Medium';
        const safeCount = [5, 10, 15, 20].includes(numQuestions) ? numQuestions : 5;

        console.log(`📝 Quiz API: topic="${topic}", difficulty=${safeDifficulty}, count=${safeCount}`);

        const result = await generateQuiz(topic.trim(), safeDifficulty, safeCount);

        if (result.error) {
            return res.status(500).json({ error: result.message });
        }

        res.json(result);
    } catch (error) {
        console.error('Quiz Generation Error:', error.message || error);
        res.status(500).json({ error: 'Unable to generate quiz right now. Please try again.' });
    }
});

// 5. Flashcard Generation Endpoint
// Used by quiz.html flashcard mode to generate AI-powered flashcards.
app.post('/api/flashcards', async (req, res) => {
    try {
        const { topic } = req.body;

        if (!topic || typeof topic !== 'string' || !topic.trim()) {
            return res.status(400).json({ error: 'Topic is required.' });
        }

        console.log(`🎴 Flashcard API: topic="${topic}"`);

        const result = await generateFlashcards(topic.trim());

        if (result.error) {
            return res.status(500).json({ error: result.message });
        }

        res.json(result);
    } catch (error) {
        console.error('Flashcard Generation Error:', error.message || error);
        res.status(500).json({ error: 'Unable to generate flashcards right now. Please try again.' });
    }
});

// 6. Sync Progress Endpoint for MCP Server
app.post('/api/sync-progress', async (req, res) => {
    try {
        const { subjectsData } = req.body;
        if (!subjectsData) {
            return res.status(400).json({ error: "No subjectsData provided." });
        }
        
        const dataDir = path.join(__dirname, 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        fs.writeFileSync(path.join(dataDir, 'progress.json'), JSON.stringify(subjectsData, null, 2));
        res.json({ success: true });
    } catch (error) {
        console.error("Sync Progress Error:", error);
        res.status(500).json({ error: "Failed to sync progress." });
    }
});

app.listen(port, () => {
    console.log(`Sathi AI Server running at http://localhost:${port}`);
});
