#!/usr/bin/env node

/**
 * mcp-server.js
 * 
 * This MCP (Model Context Protocol) server allows any MCP-compatible AI client 
 * (like Claude Desktop or another agent) to access Sathi AI's student progress 
 * data as a tool. 
 * 
 * By running this server, external agents can "see" what the student is studying 
 * in real-time, pulling directly from the synced `data/progress.json` file.
 */

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const fs = require('fs');
const path = require('path');

const server = new Server(
    {
        name: "sathi-ai-mcp",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// Helper to read the synced progress file
function getProgressData() {
    const dataPath = path.join(__dirname, '..', 'data', 'progress.json');
    if (fs.existsSync(dataPath)) {
        try {
            return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        } catch (e) {
            console.error("Failed to parse progress.json:", e);
        }
    }
    return [];
}

// 1. Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "get_student_progress",
                description: "Reads the student's learning progress across different subjects.",
                inputSchema: {
                    type: "object",
                    properties: {},
                    required: [],
                },
            },
            {
                name: "get_study_recommendation",
                description: "Analyzes the student's progress and returns a simple text recommendation of what to focus on.",
                inputSchema: {
                    type: "object",
                    properties: {},
                    required: [],
                },
            }
        ],
    };
});

// 2. Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "get_student_progress") {
        const subjects = getProgressData();
        
        // Format the response to show names, progress %, and identify weak areas
        const weakAreas = subjects.filter(sub => sub.progress < 50).map(sub => sub.name);
        
        const result = {
            subjects: subjects.map(sub => ({
                name: sub.name,
                progress: sub.progress + '%'
            })),
            weakAreas: weakAreas
        };
        
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    }

    if (request.params.name === "get_study_recommendation") {
        const subjects = getProgressData();
        
        if (subjects.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No progress data available yet. Start a subject!",
                    },
                ],
            };
        }

        const weakAreas = subjects.filter(sub => sub.progress < 50);
        let recommendation = "";

        if (weakAreas.length > 0) {
            // Pick the weakest subject
            weakAreas.sort((a, b) => a.progress - b.progress);
            recommendation = `You have some weak areas! You should highly focus on ${weakAreas[0].name} today, which is at ${weakAreas[0].progress}% completion.`;
        } else {
            recommendation = "You are doing great across all subjects! Pick any subject to revise, or move ahead with the next chapter in your favorite subject.";
        }

        return {
            content: [
                {
                    type: "text",
                    text: recommendation,
                },
            ],
        };
    }

    throw new Error(`Tool not found: ${request.params.name}`);
});

// 3. Start the standalone server via STDIO
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Sathi AI MCP server is running on stdio");
}

main().catch((error) => {
    console.error("Fatal error running MCP server:", error);
    process.exit(1);
});
