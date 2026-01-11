"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateQuiz = void 0;
const axios_1 = __importDefault(require("axios"));
const QUIZ_AI_TIMEOUT_MS = Number(process.env.QUIZ_AI_TIMEOUT_MS || 180000);
const QUIZ_AI_MAX_TOKENS = Number(process.env.QUIZ_AI_MAX_TOKENS || 2400);
const QUIZ_OLLAMA_TIMEOUT_MS = Number(process.env.QUIZ_OLLAMA_TIMEOUT_MS || 180000);
const QUIZ_OVERALL_TIMEOUT_MS = Number(process.env.QUIZ_OVERALL_TIMEOUT_MS || 300000);
const QUIZ_FAST_MODE = String(process.env.QUIZ_FAST_MODE || 'false').toLowerCase() === 'true';
const QUIZ_TARGET_LATENCY_MS = Number(process.env.QUIZ_TARGET_LATENCY_MS || 30000);
const QUIZ_FAST_MAX_QUESTIONS = Number(process.env.QUIZ_FAST_MAX_QUESTIONS || 8);
const QUIZ_FAST_MAX_TOKENS = Number(process.env.QUIZ_FAST_MAX_TOKENS || 1200);
const QUIZ_PROVIDER_TIMEOUT_MS = Number(process.env.QUIZ_PROVIDER_TIMEOUT_MS || 25000);
const QUIZ_OLLAMA_MODEL = String(process.env.QUIZ_OLLAMA_MODEL || 'llama3:latest');
const QUIZ_OLLAMA_MODEL_FAST = String(process.env.QUIZ_OLLAMA_MODEL_FAST || '');
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
async function firstSuccessful(promises) {
    return new Promise((resolve, reject) => {
        if (!promises.length)
            return reject(new Error('No promises to resolve'));
        let pending = promises.length;
        let lastError;
        for (const p of promises) {
            p.then(resolve).catch((err) => {
                lastError = err;
                pending -= 1;
                if (pending === 0)
                    reject(lastError || new Error('All providers failed'));
            });
        }
    });
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
async function fetchOllamaModelNames(timeoutMs) {
    var _a;
    if (!OLLAMA_ENDPOINT)
        return [];
    try {
        const res = await axios_1.default.get(`${OLLAMA_ENDPOINT}/api/tags`, { timeout: timeoutMs });
        const models = Array.isArray((_a = res.data) === null || _a === void 0 ? void 0 : _a.models) ? res.data.models : [];
        const names = models
            .map((m) => (typeof (m === null || m === void 0 ? void 0 : m.name) === 'string' ? m.name : null))
            .filter((n) => typeof n === 'string');
        return names;
    }
    catch (_b) {
        return [];
    }
}
function pickOllamaModel(available, fastMode) {
    const desired = (fastMode && QUIZ_OLLAMA_MODEL_FAST) ? QUIZ_OLLAMA_MODEL_FAST : QUIZ_OLLAMA_MODEL;
    if (desired && available.includes(desired))
        return desired;
    const preferredFast = [
        'phi3:mini',
        'phi3',
        'llama3.2:3b',
        'llama3.2',
        'mistral:latest',
        'mistral',
        'llama3',
        'llama3:latest',
    ];
    for (const cand of (fastMode ? preferredFast : [desired, ...preferredFast])) {
        if (typeof cand === 'string' && cand && available.includes(cand))
            return cand;
    }
    return desired || null;
}
async function tryOllama(model, prompt, timeoutMs, options) {
    var _a, _b;
    if (!OLLAMA_ENDPOINT) {
        throw new Error('Ollama endpoint not configured');
    }
    try {
        const response = await axios_1.default.post(`${OLLAMA_ENDPOINT}/api/generate`, {
            model,
            prompt,
            stream: false,
            format: 'json',
            options: options || undefined,
        }, { timeout: timeoutMs });
        return response.data.response;
    }
    catch (error) {
        const status = (_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.status;
        const data = (_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.data;
        if (status === 400 && options) {
            const response = await axios_1.default.post(`${OLLAMA_ENDPOINT}/api/generate`, {
                model,
                prompt,
                stream: false,
                options: options || undefined,
            }, { timeout: timeoutMs });
            return response.data.response;
        }
        const details = data ? ` | ollama: ${JSON.stringify(data)}` : '';
        const err = new Error(`${(error === null || error === void 0 ? void 0 : error.message) || 'Ollama request failed'}${details}`);
        err.code = error === null || error === void 0 ? void 0 : error.code;
        err.status = status;
        err.data = data;
        throw err;
    }
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
    var _a, _b, _c, _d, _e, _f, _g, _h;
    let trace;
    try {
        const startedAt = Date.now();
        const fastMode = QUIZ_FAST_MODE;
        const deadline = startedAt + (fastMode ? QUIZ_TARGET_LATENCY_MS : QUIZ_OVERALL_TIMEOUT_MS);
        const remainingMs = () => Math.max(0, deadline - Date.now());
        trace = {
            fastMode,
            startedAt,
            deadline,
            steps: [],
            providers: [],
        };
        const mark = (name, extra) => {
            trace.steps.push({ name, at: Date.now(), ms: Date.now() - startedAt, extra });
        };
        mark('start');
        const { userId, subjectId, subjectName, topic, difficulty, timeMode, questionCount, examType, questionTypes, } = req.body || {};
        if (!userId || !subjectId || !topic) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        mark('validated_input');
        if (!OPENROUTER_API_KEY && !OLLAMA_ENDPOINT) {
            return res
                .status(500)
                .json({ message: 'Server configuration error: OPENROUTER_API_KEY or OLLAMA_ENDPOINT required' });
        }
        mark('validated_config', { hasOpenRouter: !!OPENROUTER_API_KEY, hasOllama: !!OLLAMA_ENDPOINT });
        const requestedCount = Math.max(1, Math.min(Number(questionCount) || 10, 20));
        const safeQuestionCount = fastMode ? Math.min(requestedCount, Math.max(1, QUIZ_FAST_MAX_QUESTIONS)) : requestedCount;
        const safeDifficulty = (difficulty || 'Medium').toString();
        const safeTimeMode = (timeMode || 'Practice').toString();
        const safeExamType = (examType || 'School').toString();
        const safeTypes = Array.isArray(questionTypes) && questionTypes.length ? questionTypes : ['MCQ_SINGLE'];
        const baseTokenBudget = fastMode ? 450 + safeQuestionCount * 110 : 600 + safeQuestionCount * 180;
        const scaledMaxTokens = Math.max(fastMode ? 650 : 1000, Math.min(fastMode ? QUIZ_FAST_MAX_TOKENS : QUIZ_AI_MAX_TOKENS, baseTokenBudget));
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
        const prompt = fastMode
            ? `Return ONLY a valid JSON object (no markdown, no extra text).
Subject: ${subjectName || ''}
Topic: ${topic}
Exam: ${safeExamType}
Difficulty: ${safeDifficulty}
Mode: ${safeTimeMode}
Questions: ${safeQuestionCount}
Types: ${typesHint}

JSON shape:
{"title":string,"subject":string,"topic":string,"difficulty":"Easy"|"Medium"|"Hard","timeMode":"Timed"|"Practice","examType":string,"questions":[{"id":string,"type":"MCQ_SINGLE"|"MCQ_MULTI"|"SHORT"|"NUMERICAL"|"ASSERTION_REASON"|"FILL_BLANK","question":string,"options"?:string[],"correctOption"?:number,"correctOptions"?:number[],"expectedKeywords"?:string[],"numerical"?:{"finalAnswer":number,"tolerance":number}}]}

Rules:
- IDs must be unique.
- Output must be STRICT JSON.
- Keep explanations/hints out to save time.`
            : `You are an expert exam question setter.

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
        const providerTimeout = Math.max(2000, Math.min(QUIZ_PROVIDER_TIMEOUT_MS, Math.max(0, remainingMs() - 250)));
        const ollamaTimeout = Math.max(2000, Math.min(QUIZ_OLLAMA_TIMEOUT_MS, Math.max(0, remainingMs() - 250)));
        mark('computed_budgets', {
            requestedCount,
            safeQuestionCount,
            scaledMaxTokens,
            providerTimeout,
            ollamaTimeout,
            remainingMs: remainingMs(),
        });
        const parseTask = async (content) => {
            const parsed = parseAiJson(content);
            if (!parsed)
                throw new Error('AI returned empty quiz');
            const questions = parsed === null || parsed === void 0 ? void 0 : parsed.questions;
            if (!Array.isArray(questions) || questions.length === 0) {
                throw new Error('AI response format invalid: missing questions array');
            }
            return parsed;
        };
        const isQuotaOrRateLimit = (e) => {
            var _a, _b, _c, _d;
            const status = (_a = e === null || e === void 0 ? void 0 : e.response) === null || _a === void 0 ? void 0 : _a.status;
            const msg = String(((_d = (_c = (_b = e === null || e === void 0 ? void 0 : e.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.error) === null || _d === void 0 ? void 0 : _d.message) || (e === null || e === void 0 ? void 0 : e.message) || '').toLowerCase();
            return (status === 402 ||
                status === 429 ||
                msg.includes('insufficient') ||
                msg.includes('quota') ||
                msg.includes('rate limit'));
        };
        const openRouterModelsToTry = fastMode ? [openRouterModels[0], openRouterModels[2]] : openRouterModels;
        let shouldFallbackToOllama = false;
        const isTransientOpenRouterFailure = (e) => {
            var _a;
            const status = (_a = e === null || e === void 0 ? void 0 : e.response) === null || _a === void 0 ? void 0 : _a.status;
            const code = String((e === null || e === void 0 ? void 0 : e.code) || '').toUpperCase();
            const msg = String((e === null || e === void 0 ? void 0 : e.message) || '').toLowerCase();
            return (status === 408 ||
                (typeof status === 'number' && status >= 500) ||
                code === 'ECONNRESET' ||
                code === 'ETIMEDOUT' ||
                code === 'ECONNABORTED' ||
                code === 'ENOTFOUND' ||
                code === 'EAI_AGAIN' ||
                msg.includes('forcibly closed') ||
                msg.includes('socket hang up') ||
                msg.includes('unavailable'));
        };
        if (OPENROUTER_API_KEY) {
            mark('providers_started', { provider: 'openrouter', models: openRouterModelsToTry });
            for (const model of openRouterModelsToTry) {
                const t0 = Date.now();
                try {
                    const makeOpenRouterRequest = async (withResponseFormat) => {
                        const body = {
                            model,
                            messages: [
                                {
                                    role: 'system',
                                    content: 'Return ONLY a valid JSON object. Do not wrap the response in markdown fences (```), and do not include any extra text.',
                                },
                                { role: 'user', content: prompt },
                            ],
                            temperature: fastMode ? 0 : 0.2,
                            max_tokens: scaledMaxTokens,
                        };
                        if (withResponseFormat) {
                            body.response_format = { type: 'json_object' };
                        }
                        return axios_1.default.post('https://openrouter.ai/api/v1/chat/completions', body, {
                            headers: {
                                Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                                'Content-Type': 'application/json',
                                'HTTP-Referer': 'http://localhost:5173',
                            },
                            timeout: Math.min(QUIZ_AI_TIMEOUT_MS, providerTimeout),
                        });
                    };
                    let response;
                    try {
                        response = await makeOpenRouterRequest(true);
                    }
                    catch (e) {
                        const status = (_a = e === null || e === void 0 ? void 0 : e.response) === null || _a === void 0 ? void 0 : _a.status;
                        if (status === 400) {
                            // Some models/providers on OpenRouter don't support response_format.
                            response = await makeOpenRouterRequest(false);
                        }
                        else {
                            throw e;
                        }
                    }
                    trace.providers.push({ name: `openrouter:${model}`, ms: Date.now() - t0, status: response === null || response === void 0 ? void 0 : response.status });
                    const content = (_e = (_d = (_c = (_b = response.data) === null || _b === void 0 ? void 0 : _b.choices) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.message) === null || _e === void 0 ? void 0 : _e.content;
                    if (!content)
                        throw new Error('OpenRouter returned empty content');
                    aiContent = content;
                    try {
                        quizData = await parseTask(content);
                    }
                    catch (parseErr) {
                        if (!fastMode) {
                            const remainingAfter = remainingMs();
                            const repairBudget = Math.min(12000, remainingAfter);
                            const repaired = aiContent && repairBudget >= 3000 ? await tryRepairJsonWithOpenRouter(aiContent, repairBudget) : null;
                            if (repaired) {
                                quizData = parseAiJson(repaired);
                            }
                        }
                        if (!quizData)
                            throw parseErr;
                    }
                    break;
                }
                catch (e) {
                    lastError = e;
                    const status = (_f = e === null || e === void 0 ? void 0 : e.response) === null || _f === void 0 ? void 0 : _f.status;
                    trace.providers.push({
                        name: `openrouter:${model}`,
                        ms: Date.now() - t0,
                        status,
                        code: e === null || e === void 0 ? void 0 : e.code,
                        message: e === null || e === void 0 ? void 0 : e.message,
                    });
                    if (status === 401 || status === 403) {
                        shouldFallbackToOllama = true;
                        break;
                    }
                    if (isQuotaOrRateLimit(e)) {
                        shouldFallbackToOllama = true;
                        break;
                    }
                    if (isTransientOpenRouterFailure(e)) {
                        shouldFallbackToOllama = true;
                        break;
                    }
                }
            }
            if (!quizData && !shouldFallbackToOllama) {
                // If OpenRouter failed across all models for any reason, fall back to Ollama if configured.
                shouldFallbackToOllama = true;
            }
        }
        else {
            shouldFallbackToOllama = true;
        }
        if (!quizData && shouldFallbackToOllama && OLLAMA_ENDPOINT) {
            mark('providers_started', { provider: 'ollama' });
            const availableModels = await fetchOllamaModelNames(Math.min(2000, providerTimeout));
            const ollamaModel = pickOllamaModel(availableModels, fastMode);
            if (availableModels.length === 0) {
                trace.providers.push({
                    name: 'ollama:preflight',
                    ms: 0,
                    message: 'Ollama not reachable or /api/tags failed',
                });
            }
            else if (ollamaModel && !availableModels.includes(ollamaModel)) {
                trace.providers.push({
                    name: 'ollama:preflight',
                    ms: 0,
                    message: `Requested model not found. Available: ${availableModels.join(', ')}`,
                });
            }
            const extraCandidates = ['phi3:mini', 'phi3', 'mistral:latest', 'mistral', 'llama3:latest', 'llama3'];
            const modelCandidates = Array.from(new Set([ollamaModel, ...extraCandidates].filter((m) => typeof m === 'string' && !!m))).filter((m) => availableModels.includes(m));
            if (modelCandidates.length === 0) {
                lastError =
                    lastError ||
                        new Error(`Ollama fallback unavailable. Ensure Ollama is running at ${OLLAMA_ENDPOINT} and at least one model is pulled (e.g. llama3).`);
            }
            for (const model of modelCandidates) {
                const t0 = Date.now();
                try {
                    const content = await tryOllama(model, prompt, ollamaTimeout, {
                        num_predict: scaledMaxTokens,
                        temperature: fastMode ? 0 : 0.2,
                    });
                    trace.providers.push({ name: `ollama:${model}`, ms: Date.now() - t0 });
                    aiContent = content;
                    quizData = await parseTask(content);
                    break;
                }
                catch (e) {
                    lastError = e;
                    trace.providers.push({
                        name: `ollama:${model}`,
                        ms: Date.now() - t0,
                        status: e === null || e === void 0 ? void 0 : e.status,
                        code: e === null || e === void 0 ? void 0 : e.code,
                        message: e === null || e === void 0 ? void 0 : e.message,
                    });
                }
            }
        }
        if (!quizData) {
            if (remainingMs() === 0) {
                return res.status(504).json({
                    message: 'Quiz generation timed out. Please try again (or reduce question count).',
                    trace: fastMode ? trace : undefined,
                });
            }
            throw lastError || new Error('All AI providers failed to respond');
        }
        mark('success', { totalMs: Date.now() - startedAt });
        return res.status(200).json({
            quiz: quizData,
        });
    }
    catch (error) {
        const timedOut = (error === null || error === void 0 ? void 0 : error.code) === 'ECONNABORTED' || /timeout/i.test((error === null || error === void 0 ? void 0 : error.message) || '');
        const status = (_g = error === null || error === void 0 ? void 0 : error.response) === null || _g === void 0 ? void 0 : _g.status;
        const httpStatus = timedOut ? 504 : 500;
        const message = timedOut ? 'Quiz generation timed out. Please try again (or reduce question count).' : status ? `Quiz generation failed (${status})` : 'Quiz generation failed';
        return res.status(httpStatus).json({
            message,
            error: (error === null || error === void 0 ? void 0 : error.message) || String(error),
            data: ((_h = error === null || error === void 0 ? void 0 : error.response) === null || _h === void 0 ? void 0 : _h.data) || null,
            trace: process.env.NODE_ENV === 'production' ? undefined : trace,
        });
    }
};
exports.generateQuiz = generateQuiz;
