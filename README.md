# Sathi AI 🎓

### Universal AI Study Companion — Hinglish-first, Multi-Agent Architecture

> *"Padhai ab burden nahi, fun hogi!"* — For every Indian student,
> regardless of stream or language.

## 🔗 Live Links

- 🌐 **Live Demo:** https://sathi-ai.onrender.com
- 🎥 **Video Walkthrough:** https://youtu.be/pvWItaPByEk
- 💻 **GitHub Repo:** (current repo)

---

## 🎯 Problem Statement

Indian students across JEE, UPSC, Engineering, and Class 12 face:

- **English-heavy study material** despite Hindi/regional language comfort
- **No affordable, personalized AI tutoring**
- **One-size-fits-all tools** that don't adapt to their stream or weakness

## 💡 Solution

Sathi AI is a **multi-agent AI tutor** that:

- 🗣️ Speaks in friendly **Hinglish** (Hindi + English mix)
- 🔀 Automatically **routes queries** to specialist agents
- 📊 Tracks **progress** via an MCP server
- 🎯 Works for **ANY stream** — JEE, UPSC, Engineering, Arts, anything

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│           USER (Browser)                │
│   Chat / Quiz / Doubt / Voice Input     │
└──────────────────┬──────────────────────┘
                   │ POST /api/agent
                   ▼
┌─────────────────────────────────────────┐
│         ORCHESTRATOR AGENT              │
│   classifyIntent() — gemini-2.5-flash   │
│   Structured JSON schema, temp=0.0      │
│   Deterministic routing, no hallucation │
└────┬──────────────┬───────────────┬─────┘
     │              │               │
     ▼              ▼               ▼
┌─────────┐  ┌──────────┐  ┌─────────────┐
│ TUTOR   │  │  QUIZ    │  │  PLANNER    │
│ AGENT   │  │  AGENT   │  │  AGENT      │
│         │  │          │  │             │
│Explains │  │Generates │  │Study plan   │
│concepts │  │5 MCQs as │  │based on     │
│Hinglish │  │JSON schema│  │weak areas   │
└─────────┘  └──────────┘  └──────┬──────┘
                                  │ reads
                                  ▼
┌─────────────────────────────────────────┐
│         MCP SERVER (sathi-ai-mcp)       │
│   @modelcontextprotocol/sdk v1.29.0     │
│                                         │
│  Tools exposed:                         │
│  • get_student_progress                 │
│  • get_study_recommendation             │
│                                         │
│  Reads: data/progress.json              │
│  (synced from frontend localStorage     │
│   via POST /api/sync-progress)          │
└─────────────────────────────────────────┘
```

---

## 🧠 Agent Responsibilities

| Agent | Trigger | Output |
|-------|---------|--------|
| **Orchestrator** | Every request | Intent: tutor/quiz/planner |
| **TutorAgent** | Concept questions, doubts | Hinglish explanation |
| **QuizAgent** | "Quiz me", test requests | 5 MCQs as structured JSON |
| **PlannerAgent** | "What to study today" | Personalized study plan |
| **MCP Server** | External AI clients | Progress data as tools |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express |
| AI Model | gemini-2.5-flash (`@google/genai`) |
| Agent Protocol | `@modelcontextprotocol/sdk` v1.29.0 |
| Frontend | Vanilla HTML + CSS + JavaScript |
| File Uploads | Multer |
| AI Dev Tool | Antigravity 2.0 (multi-agent IDE) |

---

## ✅ Kaggle Course Concepts Used

| Concept | Where |
|---------|-------|
| Multi-agent system | `agents/` folder — orchestrator + 3 specialists |
| MCP Server | `mcp/mcp-server.js` — 2 tools exposed |
| Antigravity | Built entirely using Antigravity 2.0 |
| Security | `.env` for API keys, never in frontend code |
| Deployability | Render.com deployment, `PORT` from env |

---

## 🚀 Setup Instructions

### Prerequisites

- **Node.js** v18+
- **Gemini API key** (free at [aistudio.google.com](https://aistudio.google.com))

### Steps

```bash
git clone <your-repo-url>
cd Max
npm install
```

Create `.env` file:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Start the server:

```bash
npm start
```

Visit: **[http://localhost:3000](http://localhost:3000)**

### Run MCP Server (standalone)

```bash
node mcp/mcp-server.js
```

---

## 📁 Project Structure

```
Max/
├── agents/
│   ├── orchestrator.js     # Intent classifier
│   ├── tutorAgent.js       # Concept explainer
│   ├── quizAgent.js        # MCQ generator
│   └── plannerAgent.js     # Study planner
├── mcp/
│   └── mcp-server.js       # MCP server (2 tools)
├── data/
│   └── progress.json       # Synced student progress
├── public/
│   ├── screens/            # All HTML screens
│   ├── js/                 # auth, store, dark-mode
│   └── components/         # Floating voice widget
└── server.js               # Express backend + all endpoints
```

---

## 🌟 Key Features

- 🤖 **Multi-agent routing** with Orchestrator
- 📚 **Universal subjects** (any stream — JEE/UPSC/Engineering)
- 🎤 **Voice input** (Web Speech API)
- 📷 **Image/PDF doubt analysis** (Gemini Vision)
- 🌙 **Dark mode**
- 🔥 **Daily study streak tracker**
- 📥 **PDF notes export** (jsPDF)
- 🔒 **Secure** — API keys server-side only

---

## 🇮🇳 Bhashini Roadmap

Applied for **Bhashini API** (Government of India's multilingual AI initiative) to extend Sathi AI to **10+ Indian languages** via ASR + NMT + TTS pipelines. Architecture is already language-agnostic — Bhashini becomes a pre/post-processing layer without changing core agent logic.

**Target languages:** Hindi, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Odia

---

## 🏆 Track: Agents for Good

Education access for **every Indian student** — regardless of language, stream, or economic background.

---

*Made with ❤️ by Nil Kumar Bhadani, IIT Jodhpur*
*Built using Antigravity 2.0 + Gemini 2.5 Flash*
