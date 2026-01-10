"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateQuiz = void 0;
const axios_1 = __importDefault(require("axios"));
const QUIZ_AI_TIMEOUT_MS = Number(process.env.QUIZ_AI_TIMEOUT_MS || 25000);
const QUIZ_AI_MAX_TOKENS = Number(process.env.QUIZ_AI_MAX_TOKENS || 2400);
const QUIZ_OLLAMA_TIMEOUT_MS = Number(process.env.QUIZ_OLLAMA_TIMEOUT_MS || 30000);
const QUIZ_OVERALL_TIMEOUT_MS = Number(process.env.QUIZ_OVERALL_TIMEOUT_MS || 35000);
function stripMarkdownCodeFences(text) {
    const trimmed = text.trim();
    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenceMatch === null || fenceMatch === void 0 ? void 0 : fenceMatch[1])
        return fenceMatch[1].trim();
    return trimmed;
}
function extractFirstJsonObject(text) {
    const startIndex = text.indexOf('{');
    if (startIndex === -1)
        return null;
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
            if (depth === 0)
                return text.slice(startIndex, i + 1);
        }
    }
    return null;
}
function escapeInvalidNewlinesInJsonStrings(jsonText) {
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
function repairInvalidJsonEscapesInStrings(jsonText) {
    let out = '';
    let inString = false;
    let escaped = false;
    const isValidEscape = (ch) => ch === '"' || ch === '\\' || ch === '/' || ch === 'b' || ch === 'f' || ch === 'n' || ch === 'r' || ch === 't' || ch === 'u';
    for (let i = 0; i < jsonText.length; i++) {
        const ch = jsonText[i];
        if (inString) {
            if (escaped) {
                if (!isValidEscape(ch)) {
                    out += ch;
                }
                else {
                    out += ch;
                }
                escaped = false;
                continue;
            }
            if (ch === '\\') {
                const next = jsonText[i + 1];
                if (next && !isValidEscape(next)) {
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
function parseAiJson(aiContent) {
    var _a;
    const withoutFences = stripMarkdownCodeFences(aiContent);
    const jsonCandidate = (_a = extractFirstJsonObject(withoutFences)) !== null && _a !== void 0 ? _a : withoutFences;
    try {
        return JSON.parse(jsonCandidate);
    }
    catch (_b) {
        const withNewlinesFixed = escapeInvalidNewlinesInJsonStrings(jsonCandidate);
        const repaired = repairInvalidJsonEscapesInStrings(withNewlinesFixed);
        return JSON.parse(repaired);
    }
}
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OLLAMA_ENDPOINT = process.env.OLLAMA_ENDPOINT;
async function tryOllama(model, prompt, timeoutMs) {
    if (!OLLAMA_ENDPOINT) {
        throw new Error('Ollama endpoint not configured');
    }
    const response = await axios_1.default.post(`${OLLAMA_ENDPOINT}/api/generate`, {
        model,
        prompt,
        stream: false,
        format: 'json',
    }, { timeout: timeoutMs });
    return response.data.response;
}
async function tryRepairJsonWithOpenRouter(rawText, timeoutMs) {
    var _a, _b, _c, _d;
    if (!OPENROUTER_API_KEY)
        return null;
    const repairModels = [
        'mistralai/mistral-7b-instruct:free',
        'meta-llama/llama-3.2-3b-instruct:free',
    ];
    const repairPrompt = `Fix the following into a SINGLE strictly valid JSON object.
Rules:
- Output ONLY JSON, no markdown fences, no extra text.
- Preserve the schema and content as much as possible.

INPUT:
${rawText}`;
    for (const model of repairModels) {
        try {
            const response = await axios_1.default.post('https://openrouter.ai/api/v1/chat/completions', {
                model,
                messages: [
                    {
                        role: 'system',
                        content: 'Return ONLY a valid JSON object. Do not wrap in markdown fences and do not add commentary.',
                    },
                    { role: 'user', content: repairPrompt },
                ],
                temperature: 0,
                max_tokens: 1200,
                response_format: { type: 'json_object' },
            }, {
                headers: {
                    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'http://localhost:5173',
                },
                timeout: timeoutMs,
            });
            const content = (_d = (_c = (_b = (_a = response.data) === null || _a === void 0 ? void 0 : _a.choices) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.message) === null || _d === void 0 ? void 0 : _d.content;
            if (typeof content === 'string' && content.trim())
                return content;
            if (content && typeof content === 'object')
                return JSON.stringify(content);
        }
        catch (_e) {
            // ignore and try next model
        }
    }
    return null;
}
const generateQuiz = async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g;
    try {
        const startedAt = Date.now();
        const deadline = startedAt + QUIZ_OVERALL_TIMEOUT_MS;
        const remainingMs = () => Math.max(0, deadline - Date.now());
        const { userId, subjectId, subjectName, topic, difficulty, timeMode, questionCount, examType, questionTypes, } = req.body || {};
        if (!userId || !subjectId || !topic) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        if (!OPENROUTER_API_KEY && !OLLAMA_ENDPOINT) {
            return res
                .status(500)
                .json({ message: 'Server configuration error: OPENROUTER_API_KEY or OLLAMA_ENDPOINT required' });
        }
        const safeQuestionCount = Math.max(1, Math.min(Number(questionCount) || 10, 20));
        const safeDifficulty = (difficulty || 'Medium').toString();
        const safeTimeMode = (timeMode || 'Practice').toString();
        const safeExamType = (examType || 'School').toString();
        const safeTypes = Array.isArray(questionTypes) && questionTypes.length ? questionTypes : ['MCQ_SINGLE'];
        const scaledMaxTokens = Math.max(1000, Math.min(QUIZ_AI_MAX_TOKENS, 600 + safeQuestionCount * 180));
        const typesHint = safeTypes
            .map((t) => t === 'MCQ_SINGLE'
            ? 'MCQ (single correct)'
            : t === 'MCQ_MULTI'
                ? 'MCQ (multiple correct)'
                : t === 'SHORT'
                    ? 'Short answer'
                    : t === 'NUMERICAL'
                        ? 'Numerical problem'
                        : t === 'ASSERTION_REASON'
                            ? 'Assertion-Reason'
                            : t === 'FILL_BLANK'
                                ? 'Fill in the blanks'
                                : t)
            .join(', ');
        const prompt = `You are an expert exam question setter.

Generate a syllabus-aligned practice quiz as a SINGLE valid JSON object ONLY (no markdown fences, no extra text).

Context:
- Subject: ${subjectName || ''}
- Topic/Chapter: ${topic}
- Exam type: ${safeExamType}
- Difficulty: ${safeDifficulty}
- Mode: ${safeTimeMode}
- Number of questions: ${safeQuestionCount}
- Question types to include (mix them): ${typesHint}

Return JSON with this shape:
{
  "title": string,
  "subject": string,
  "topic": string,
  "difficulty": "Easy"|"Medium"|"Hard",
  "timeMode": "Timed"|"Practice",
  "examType": string,
  "questions": [
    {
      "id": string,
      "type": "MCQ_SINGLE"|"MCQ_MULTI"|"SHORT"|"NUMERICAL"|"ASSERTION_REASON"|"FILL_BLANK",
      "question": string,
      "options"?: string[],
      "correctOption"?: number,
      "correctOptions"?: number[],
      "expectedKeywords"?: string[],
      "numerical"?: {
        "finalAnswer": number,
        "tolerance": number,
        "unit"?: string
      },
      "assertionReason"?: {
        "assertion": string,
        "reason": string,
        "options": ["A", "B", "C", "D"],
        "correctOption": "A"|"B"|"C"|"D"
      },
      "fillBlank"?: {
        "textWithBlank": string,
        "answer": string
      },
      "hints"?: {
        "hint1": string,
        "hint2": string
      },
      "explanation"?: string,
      "examTips"?: string,
      "shortcutTrick"?: string
    }
  ]
}

Constraints:
- IDs must be unique strings.
- For MCQ_MULTI: correctOptions must contain 2+ indexes.
- Prefer including hints and a short explanation, but keep them brief.
- JSON must be strictly valid. Escape newlines as \\n inside strings.
`;
        const openRouterModels = [
            'google/gemini-2.0-flash-exp:free',
            'mistralai/mistral-7b-instruct:free',
            'meta-llama/llama-3.2-3b-instruct:free',
            'meta-llama/llama-3.3-70b-instruct:free',
        ];
        let aiContent;
        let quizData;
        let lastError;
        if (OPENROUTER_API_KEY) {
            for (const model of openRouterModels) {
                const remaining = remainingMs();
                if (remaining < 3000)
                    break;
                try {
                    const response = await axios_1.default.post('https://openrouter.ai/api/v1/chat/completions', {
                        model,
                        messages: [
                            {
                                role: 'system',
                                content: 'Return ONLY a valid JSON object. Do not wrap the response in markdown fences (```), and do not include any extra text.',
                            },
                            { role: 'user', content: prompt },
                        ],
                        temperature: 0.2,
                        max_tokens: scaledMaxTokens,
                        response_format: { type: 'json_object' },
                    }, {
                        headers: {
                            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                            'Content-Type': 'application/json',
                            'HTTP-Referer': 'http://localhost:5173',
                        },
                        timeout: Math.min(QUIZ_AI_TIMEOUT_MS, remaining),
                    });
                    aiContent = (_d = (_c = (_b = (_a = response.data) === null || _a === void 0 ? void 0 : _a.choices) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.message) === null || _d === void 0 ? void 0 : _d.content;
                    if (!aiContent)
                        continue;
                    try {
                        quizData = parseAiJson(aiContent);
                        if (quizData)
                            break;
                    }
                    catch (parseError) {
                        lastError = parseError;
                        const remainingAfter = remainingMs();
                        const repairBudget = Math.min(12000, remainingAfter);
                        const repaired = repairBudget >= 3000 ? await tryRepairJsonWithOpenRouter(aiContent, repairBudget) : null;
                        if (repaired) {
                            try {
                                quizData = parseAiJson(repaired);
                                if (quizData)
                                    break;
                            }
                            catch (repairParseError) {
                                lastError = repairParseError;
                            }
                        }
                        // parsing failed -> try next model instead of failing immediately
                        continue;
                    }
                }
                catch (error) {
                    lastError = error;
                    const statusCode = (_e = error.response) === null || _e === void 0 ? void 0 : _e.status;
                    if (statusCode === 429 || (statusCode >= 500 && statusCode < 600)) {
                        continue;
                    }
                    break;
                }
            }
        }
        if (!quizData && OLLAMA_ENDPOINT) {
            const ollamaModels = ['mistral', 'llama3'];
            for (const model of ollamaModels) {
                const remaining = remainingMs();
                if (remaining < 3000)
                    break;
                try {
                    aiContent = await tryOllama(model, prompt, Math.min(QUIZ_OLLAMA_TIMEOUT_MS, remaining));
                    if (!aiContent)
                        continue;
                    try {
                        quizData = parseAiJson(aiContent);
                        if (quizData)
                            break;
                    }
                    catch (parseError) {
                        lastError = parseError;
                        const remainingAfter = remainingMs();
                        const repairBudget = Math.min(12000, remainingAfter);
                        const repaired = repairBudget >= 3000 ? await tryRepairJsonWithOpenRouter(aiContent, repairBudget) : null;
                        if (repaired) {
                            try {
                                quizData = parseAiJson(repaired);
                                if (quizData)
                                    break;
                            }
                            catch (repairParseError) {
                                lastError = repairParseError;
                            }
                        }
                        continue;
                    }
                }
                catch (error) {
                    lastError = error;
                }
            }
        }
        if (!quizData) {
            if (remainingMs() === 0) {
                return res.status(504).json({
                    message: 'Quiz generation timed out. Please try again (or reduce question count).',
                });
            }
            throw lastError || new Error('All AI providers failed to respond');
        }
        return res.status(200).json({
            quiz: quizData,
        });
    }
    catch (error) {
        const timedOut = (error === null || error === void 0 ? void 0 : error.code) === 'ECONNABORTED' || /timeout/i.test((error === null || error === void 0 ? void 0 : error.message) || '');
        const status = (_f = error === null || error === void 0 ? void 0 : error.response) === null || _f === void 0 ? void 0 : _f.status;
        const httpStatus = timedOut ? 504 : 500;
        const message = timedOut ? 'Quiz generation timed out. Please try again (or reduce question count).' : status ? `Quiz generation failed (${status})` : 'Quiz generation failed';
        return res.status(httpStatus).json({
            message,
            error: (error === null || error === void 0 ? void 0 : error.message) || String(error),
            data: ((_g = error === null || error === void 0 ? void 0 : error.response) === null || _g === void 0 ? void 0 : _g.data) || null,
        });
    }
};
exports.generateQuiz = generateQuiz;
