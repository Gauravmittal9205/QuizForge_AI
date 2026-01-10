import { Request, Response } from 'express';
import LearningSession from '../models/learningSessionModel';
import Syllabus from '../models/syllabusModel';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const LOG_FILE = path.join(process.cwd(), 'debug.log');

 function stripMarkdownCodeFences(text: string) {
     const trimmed = text.trim();
     const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
     if (fenceMatch?.[1]) return fenceMatch[1].trim();
     return trimmed;
 }

 function extractFirstJsonObject(text: string) {
     const startIndex = text.indexOf('{');
     if (startIndex === -1) return null;

     let depth = 0;
     let inString = false;
     let escaped = false;

     for (let i = startIndex; i < text.length; i++) {
         const ch = text[i];

         if (inString) {
             if (escaped) {
                 escaped = false;
                 continue;
             }
             if (ch === '\\') {
                 escaped = true;
                 continue;
             }
             if (ch === '"') {
                 inString = false;
                 continue;
             }
             continue;
         }

         if (ch === '"') {
             inString = true;
             continue;
         }
         if (ch === '{') {
             depth++;
             continue;
         }
         if (ch === '}') {
             depth--;
             if (depth === 0) return text.slice(startIndex, i + 1);
         }
     }

     return null;
 }

 function escapeInvalidNewlinesInJsonStrings(jsonText: string) {
     let out = '';
     let inString = false;
     let escaped = false;

     for (let i = 0; i < jsonText.length; i++) {
         const ch = jsonText[i];

         if (inString) {
             if (escaped) {
                 out += ch;
                 escaped = false;
                 continue;
             }
             if (ch === '\\') {
                 out += ch;
                 escaped = true;
                 continue;
             }
             if (ch === '"') {
                 out += ch;
                 inString = false;
                 continue;
             }
             if (ch === '\n') {
                 out += '\\n';
                 continue;
             }
             if (ch === '\r') {
                 continue;
             }
             out += ch;
             continue;
         }

         if (ch === '"') {
             inString = true;
         }
         out += ch;
     }

     return out;
 }

 function repairInvalidJsonEscapesInStrings(jsonText: string) {
     let out = '';
     let inString = false;
     let escaped = false;

     const isValidEscape = (ch: string) =>
         ch === '"' || ch === '\\' || ch === '/' || ch === 'b' || ch === 'f' || ch === 'n' || ch === 'r' || ch === 't' || ch === 'u';

     for (let i = 0; i < jsonText.length; i++) {
         const ch = jsonText[i];

         if (inString) {
             if (escaped) {
                 // We are processing the character after a backslash inside a JSON string.
                 // If it's an invalid escape (common in LLM outputs, e.g. \' ), remove the backslash.
                 if (!isValidEscape(ch)) {
                     out += ch;
                 } else {
                     out += ch;
                 }
                 escaped = false;
                 continue;
             }

             if (ch === '\\') {
                 // Peek next char to decide if we should keep the backslash.
                 const next = jsonText[i + 1];
                 if (next && !isValidEscape(next)) {
                     // Drop the backslash; next loop iteration will emit the next char.
                     continue;
                 }
                 out += ch;
                 escaped = true;
                 continue;
             }

             if (ch === '"') {
                 out += ch;
                 inString = false;
                 continue;
             }

             out += ch;
             continue;
         }

         if (ch === '"') {
             inString = true;
         }
         out += ch;
     }

     return out;
 }

 function parseAiJson(aiContent: string) {
     const withoutFences = stripMarkdownCodeFences(aiContent);
     const jsonCandidate = extractFirstJsonObject(withoutFences) ?? withoutFences;

     try {
         return JSON.parse(jsonCandidate);
     } catch (err) {
         const withNewlinesFixed = escapeInvalidNewlinesInJsonStrings(jsonCandidate);
         const repaired = repairInvalidJsonEscapesInStrings(withNewlinesFixed);
         return JSON.parse(repaired);
     }
 }

function logError(message: string, error: any) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\nError: ${error.message}\nStack: ${error.stack}\nData: ${JSON.stringify(error.response?.data || {})}\n\n`;
    fs.appendFileSync(LOG_FILE, logMessage);
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OLLAMA_ENDPOINT = process.env.OLLAMA_ENDPOINT;

// Helper function to try Ollama local models
async function tryOllamaModel(model: string, prompt: string) {
    if (!OLLAMA_ENDPOINT) {
        throw new Error('Ollama endpoint not configured');
    }

    const response = await axios.post(
        `${OLLAMA_ENDPOINT}/api/generate`,
        {
            model: model,
            prompt: prompt,
            stream: false,
            format: 'json'
        },
        {
            timeout: 120000 // 2 minutes for local processing
        }
    );

    return response.data.response;
}

export const startSession = async (req: Request, res: Response) => {
    try {
        const { userId, subjectId, subjectName, topic, level } = req.body;
        const apiKey = process.env.OPENROUTER_API_KEY;

        if (!userId || !subjectId || !topic || !level) {
            return res.status(400).json({
                message: "Missing required fields",
                received: { userId: !!userId, subjectId: !!subjectId, topic, level }
            });
        }

        if (!apiKey) {
            console.error("CRITICAL: OPENROUTER_API_KEY is missing");
            return res.status(500).json({ message: "Server configuration error: API Key missing" });
        }

        // Call Gemini (via OpenRouter) to generate content
        const prompt = `You are an expert AI tutor. Explain the topic "${topic}" for a ${level} level student in structured sections.
    Return ONLY a valid JSON object. Do NOT wrap the response in markdown fences (no \`\`\`json ... \`\`\`). Do NOT include any extra text.
    The response must be a valid JSON object with a "sections" array. Each section must have a "title" and "content" (in markdown).
    IMPORTANT: The "content" value must be a valid JSON string (escape newlines as \\n and escape quotes as \\").
    Include these sections:
    1. Definition
    2. Types
    3. Operations
    4. Examples
    5. Exam Notes
    
    Ensure the content is detailed and accurate.`;

        console.log(`Starting AI session for topic: ${topic}, level: ${level} for user: ${userId}`);

        const openRouterModels = [
            "google/gemini-2.0-flash-exp:free",
            "meta-llama/llama-3.3-70b-instruct:free",
            "meta-llama/llama-3.2-3b-instruct:free",
            "mistralai/mistral-7b-instruct:free"
        ];

        const ollamaModels = OLLAMA_ENDPOINT ? ["llama3", "mistral"] : [];

        let response;
        let lastError;
        let aiContent;

        // Try OpenRouter models first
        for (const model of openRouterModels) {
            try {
                console.log(`Attempting with model: ${model}`);
                response = await axios.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    {
                        model: model,
                        messages: [
                            { role: "system", content: "Return ONLY a valid JSON object. Do not wrap the response in markdown fences (```), and do not include any extra text." },
                            { role: "user", content: prompt }
                        ]
                    },
                    {
                        headers: {
                            "Authorization": `Bearer ${apiKey}`,
                            "Content-Type": "application/json",
                            "HTTP-Referer": "http://localhost:5173",
                        },
                        timeout: 60000
                    }
                );

                // If successful, break out of the loop
                console.log(`Model ${model} succeeded!`);
                break;
            } catch (error: any) {
                lastError = error;
                const statusCode = error.response?.status;
                console.warn(`Model ${model} failed with status ${statusCode}`);

                // Retry on rate limiting (429) or server errors (5xx) as they're often transient
                if (statusCode === 429 || (statusCode >= 500 && statusCode < 600)) {
                    if (statusCode === 429) {
                        console.log(`Model ${model} is rate limited, trying next fallback model...`);
                    } else {
                        console.log(`Model ${model} encountered a server error (${statusCode}), trying next fallback model...`);
                    }
                    continue;
                }

                // For other errors (like 400, 401, 404), don't fallback as they indicate a config issue
                throw error;
            }
        }

        // If OpenRouter failed, try Ollama as final fallback
        if (!response && ollamaModels.length > 0) {
            console.log('All OpenRouter models exhausted, trying local Ollama models...');

            for (const ollamaModel of ollamaModels) {
                try {
                    console.log(`Attempting with Ollama model: ${ollamaModel}`);
                    aiContent = await tryOllamaModel(ollamaModel, prompt);
                    console.log(`Ollama model ${ollamaModel} succeeded!`);
                    break;
                } catch (error: any) {
                    console.warn(`Ollama model ${ollamaModel} failed:`, error.message);
                    lastError = error;
                }
            }
        } else if (response) {
            aiContent = response.data.choices?.[0]?.message?.content;
        }

        if (!aiContent) {
            console.error("All AI providers failed");
            throw lastError || new Error("All AI models (OpenRouter + Ollama) failed to respond");
        }

        let aiData;
        try {
            aiData = parseAiJson(aiContent);
        } catch (parseError: any) {
            console.error("AI Response Parsing Failed:", aiContent);
            return res.status(500).json({
                message: "Failed to parse AI response",
                error: parseError?.message || String(parseError),
                details: aiContent.substring(0, 200),
                raw: aiContent
            });
        }

        if (!aiData.sections || !Array.isArray(aiData.sections)) {
            console.error("AI Response missing sections:", aiData);
            return res.status(500).json({
                message: "AI response format invalid: missing sections array",
                data: aiData
            });
        }

        const newSession = new LearningSession({
            userId,
            subjectId,
            subjectName,
            topic,
            level,
            sections: aiData.sections,
            status: 'active',
            progress: 0,
            currentSectionIndex: 0
        });

        const savedSession = await newSession.save();
        console.log(`Successfully created learning session for ${topic}`);
        res.status(201).json(savedSession);
    } catch (error: any) {
        logError("Start Session Failed", error);
        console.error("Start Session Error Details:", {
            message: error.message,
            response: error.response?.data,
            stack: error.stack
        });

        const isRateLimited = error.response?.status === 429 || error.message?.includes('429') || error.message?.includes('All AI models failed');
        const openRouterError = error.response?.data?.error?.message;
        const mongooseError = error.errors ? Object.keys(error.errors).map(k => error.errors[k].message).join(', ') : null;

        const finalMessage = isRateLimited
            ? OLLAMA_ENDPOINT
                ? "All AI models are currently very busy. Please wait 30-60 seconds and try again."
                : "All AI models are currently very busy. Please wait 30-60 seconds, or install Ollama (https://ollama.ai) for unlimited free local AI."
            : (openRouterError || mongooseError || error.message);

        res.status(isRateLimited ? 429 : 500).json({
            message: finalMessage,
            error: openRouterError || mongooseError || error.message,
            debug_info: error.response?.data || null
        });
    }
};

export const getSession = async (req: Request, res: Response) => {
    try {
        const session = await LearningSession.findById(req.params.id);
        if (!session) return res.status(404).json({ message: "Session not found" });
        res.json(session);
    } catch (error) {
        res.status(500).json({ message: "Error fetching session" });
    }
};

export const getUserSessions = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const sessions = await LearningSession.find({ userId }).sort({ updatedAt: -1 });
        res.json(sessions);
    } catch (error) {
        res.status(500).json({ message: "Error fetching user sessions" });
    }
};

export const updateSession = async (req: Request, res: Response) => {
    try {
        const { currentSectionIndex, progress, notes, status, difficultyFeedback } = req.body;
        const session = await LearningSession.findByIdAndUpdate(
            req.params.id,
            { currentSectionIndex, progress, notes, status, difficultyFeedback },
            { new: true }
        );

        if (!session) return res.status(404).json({ message: "Session not found" });

        // Link with Syllabus Tracker if marked as completed
        if (status === 'completed') {
            // We can optionally find the topic in the syllabus and mark it [x]
            // But based on the request, we should probably do this when "Mark as Learned" is clicked.
            // The 'status' being 'completed' here might just be session end.
        }

        res.json(session);
    } catch (error) {
        res.status(500).json({ message: "Error updating session" });
    }
};

export const completeTopicInSyllabus = async (req: Request, res: Response) => {
    try {
        const { subjectId, topicName } = req.body;
        const syllabus = await Syllabus.findById(subjectId);
        if (!syllabus) return res.status(404).json({ message: "Syllabus not found" });

        let updated = false;
        syllabus.chapters.forEach(chapter => {
            if (chapter.description) {
                const lines = chapter.description.split('\n');
                const newLines = lines.map(line => {
                    if (line.toLowerCase().includes(topicName.toLowerCase()) && line.includes('[ ]')) {
                        updated = true;
                        return line.replace('[ ]', '[x]');
                    }
                    return line;
                });
                chapter.description = newLines.join('\n');
            }
        });

        if (updated) {
            await syllabus.save();
        }

        res.json({ success: true, updated });
    } catch (error) {
        res.status(500).json({ message: "Error updating syllabus topic" });
    }
};
