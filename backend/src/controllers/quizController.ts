import { Request, Response } from 'express';
import axios from 'axios';

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

async function firstSuccessful<T>(promises: Array<Promise<T>>) {
  return new Promise<T>((resolve, reject) => {
    if (!promises.length) return reject(new Error('No promises to resolve'));
    let pending = promises.length;
    let lastError: any;

    for (const p of promises) {
      p.then(resolve).catch((err) => {
        lastError = err;
        pending -= 1;
        if (pending === 0) reject(lastError || new Error('All providers failed'));
      });
    }
  });
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
        if (!isValidEscape(ch)) {
          out += ch;
        } else {
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

function parseAiJson(aiContent: string) {
  const withoutFences = stripMarkdownCodeFences(aiContent);
  const jsonCandidate = extractFirstJsonObject(withoutFences) ?? withoutFences;

  try {
    return JSON.parse(jsonCandidate);
  } catch {
    const withNewlinesFixed = escapeInvalidNewlinesInJsonStrings(jsonCandidate);
    const repaired = repairInvalidJsonEscapesInStrings(withNewlinesFixed);
    return JSON.parse(repaired);
  }
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OLLAMA_ENDPOINT = process.env.OLLAMA_ENDPOINT;

async function fetchOllamaModelNames(timeoutMs: number): Promise<string[]> {
  if (!OLLAMA_ENDPOINT) return [];
  try {
    const res = await axios.get(`${OLLAMA_ENDPOINT}/api/tags`, { timeout: timeoutMs });
    const models = Array.isArray(res.data?.models) ? res.data.models : [];
    const names = models
      .map((m: any) => (typeof m?.name === 'string' ? m.name : null))
      .filter((n: any) => typeof n === 'string');
    return names;
  } catch {
    return [];
  }
}

function pickOllamaModel(available: string[], fastMode: boolean) {
  const desired = (fastMode && QUIZ_OLLAMA_MODEL_FAST) ? QUIZ_OLLAMA_MODEL_FAST : QUIZ_OLLAMA_MODEL;
  if (desired && available.includes(desired)) return desired;

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
    if (typeof cand === 'string' && cand && available.includes(cand)) return cand;
  }
  return desired || null;
}

async function tryOllama(
  model: string,
  prompt: string,
  timeoutMs: number,
  options?: {
    num_predict?: number;
    temperature?: number;
  }
) {
  if (!OLLAMA_ENDPOINT) {
    throw new Error('Ollama endpoint not configured');
  }

  try {
    const response = await axios.post(
      `${OLLAMA_ENDPOINT}/api/generate`,
      {
        model,
        prompt,
        stream: false,
        format: 'json',
        options: options || undefined,
      },
      { timeout: timeoutMs }
    );

    return response.data.response;
  } catch (error: any) {
    const status = error?.response?.status;
    const data = error?.response?.data;
    if (status === 400 && options) {
      const response = await axios.post(
        `${OLLAMA_ENDPOINT}/api/generate`,
        {
          model,
          prompt,
          stream: false,
          options: options || undefined,
        },
        { timeout: timeoutMs }
      );
      return response.data.response;
    }
    const details = data ? ` | ollama: ${JSON.stringify(data)}` : '';
    const err = new Error(`${error?.message || 'Ollama request failed'}${details}`) as any;
    err.code = error?.code;
    err.status = status;
    err.data = data;
    throw err;
  }
}

async function tryRepairJsonWithOpenRouter(rawText: string, timeoutMs: number) {
  if (!OPENROUTER_API_KEY) return null;

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
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
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
        },
        {
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:5173',
          },
          timeout: timeoutMs,
        }
      );

      const content = response.data?.choices?.[0]?.message?.content;
      if (typeof content === 'string' && content.trim()) return content;
      if (content && typeof content === 'object') return JSON.stringify(content);
    } catch {
      // ignore and try next model
    }
  }

  return null;
}

export const generateQuiz = async (req: Request, res: Response) => {
  let trace: any | undefined;
  try {
    const startedAt = Date.now();
    const fastMode = QUIZ_FAST_MODE;
    const deadline = startedAt + (fastMode ? QUIZ_TARGET_LATENCY_MS : QUIZ_OVERALL_TIMEOUT_MS);
    const remainingMs = () => Math.max(0, deadline - Date.now());
    trace = {
      fastMode,
      startedAt,
      deadline,
      steps: [] as Array<{ name: string; at: number; ms: number; extra?: any }>,
      providers: [] as Array<{ name: string; status?: number; code?: string; ms: number; message?: string }>,
    };

    const mark = (name: string, extra?: any) => {
      trace.steps.push({ name, at: Date.now(), ms: Date.now() - startedAt, extra });
    };
    mark('start');

    const {
      userId,
      subjectId,
      subjectName,
      topic,
      difficulty,
      timeMode,
      questionCount,
      examType,
      questionTypes,
    } = req.body || {};

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
    const scaledMaxTokens = Math.max(
      fastMode ? 650 : 1000,
      Math.min(fastMode ? QUIZ_FAST_MAX_TOKENS : QUIZ_AI_MAX_TOKENS, baseTokenBudget)
    );

    const typesHint = safeTypes
      .map((t: string) =>
        t === 'MCQ_SINGLE'
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
          : t
      )
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

    let aiContent: string | undefined;
    let quizData: any;
    let lastError: any;

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

    const parseTask = async (content: string) => {
      const parsed = parseAiJson(content);
      if (!parsed) throw new Error('AI returned empty quiz');
      const questions = (parsed as any)?.questions;
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('AI response format invalid: missing questions array');
      }
      return parsed;
    };

    const isQuotaOrRateLimit = (e: any) => {
      const status = e?.response?.status;
      const msg = String(e?.response?.data?.error?.message || e?.message || '').toLowerCase();
      return (
        status === 402 ||
        status === 429 ||
        msg.includes('insufficient') ||
        msg.includes('quota') ||
        msg.includes('rate limit')
      );
    };

    const openRouterModelsToTry = fastMode ? [openRouterModels[0], openRouterModels[2]] : openRouterModels;
    let shouldFallbackToOllama = false;

    const isTransientOpenRouterFailure = (e: any) => {
      const status = e?.response?.status;
      const code = String(e?.code || '').toUpperCase();
      const msg = String(e?.message || '').toLowerCase();
      return (
        status === 408 ||
        (typeof status === 'number' && status >= 500) ||
        code === 'ECONNRESET' ||
        code === 'ETIMEDOUT' ||
        code === 'ECONNABORTED' ||
        code === 'ENOTFOUND' ||
        code === 'EAI_AGAIN' ||
        msg.includes('forcibly closed') ||
        msg.includes('socket hang up') ||
        msg.includes('unavailable')
      );
    };

    if (OPENROUTER_API_KEY) {
      mark('providers_started', { provider: 'openrouter', models: openRouterModelsToTry });
      for (const model of openRouterModelsToTry) {
        const t0 = Date.now();
        try {
          const makeOpenRouterRequest = async (withResponseFormat: boolean) => {
            const body: any = {
              model,
              messages: [
                {
                  role: 'system',
                  content:
                    'Return ONLY a valid JSON object. Do not wrap the response in markdown fences (```), and do not include any extra text.',
                },
                { role: 'user', content: prompt },
              ],
              temperature: fastMode ? 0 : 0.2,
              max_tokens: scaledMaxTokens,
            };

            if (withResponseFormat) {
              body.response_format = { type: 'json_object' };
            }

            return axios.post('https://openrouter.ai/api/v1/chat/completions', body, {
              headers: {
                Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'http://localhost:5173',
              },
              timeout: Math.min(QUIZ_AI_TIMEOUT_MS, providerTimeout),
            });
          };

          let response: any;
          try {
            response = await makeOpenRouterRequest(true);
          } catch (e: any) {
            const status = e?.response?.status;
            if (status === 400) {
              // Some models/providers on OpenRouter don't support response_format.
              response = await makeOpenRouterRequest(false);
            } else {
              throw e;
            }
          }

          trace.providers.push({ name: `openrouter:${model}`, ms: Date.now() - t0, status: response?.status });
          const content = response.data?.choices?.[0]?.message?.content;
          if (!content) throw new Error('OpenRouter returned empty content');
          aiContent = content;

          try {
            quizData = await parseTask(content);
          } catch (parseErr: any) {
            if (!fastMode) {
              const remainingAfter = remainingMs();
              const repairBudget = Math.min(12000, remainingAfter);
              const repaired = aiContent && repairBudget >= 3000 ? await tryRepairJsonWithOpenRouter(aiContent, repairBudget) : null;
              if (repaired) {
                quizData = parseAiJson(repaired);
              }
            }
            if (!quizData) throw parseErr;
          }

          break;
        } catch (e: any) {
          lastError = e;
          const status = e?.response?.status;
          trace.providers.push({
            name: `openrouter:${model}`,
            ms: Date.now() - t0,
            status,
            code: e?.code,
            message: e?.message,
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
    } else {
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
      } else if (ollamaModel && !availableModels.includes(ollamaModel)) {
        trace.providers.push({
          name: 'ollama:preflight',
          ms: 0,
          message: `Requested model not found. Available: ${availableModels.join(', ')}`,
        });
      }

      const extraCandidates = ['phi3:mini', 'phi3', 'mistral:latest', 'mistral', 'llama3:latest', 'llama3'];
      const modelCandidates = Array.from(
        new Set([ollamaModel, ...extraCandidates].filter((m): m is string => typeof m === 'string' && !!m))
      ).filter((m) => availableModels.includes(m));

      if (modelCandidates.length === 0) {
        lastError =
          lastError ||
          new Error(
            `Ollama fallback unavailable. Ensure Ollama is running at ${OLLAMA_ENDPOINT} and at least one model is pulled (e.g. llama3).`
          );
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
        } catch (e: any) {
          lastError = e;
          trace.providers.push({
            name: `ollama:${model}`,
            ms: Date.now() - t0,
            status: e?.status,
            code: e?.code,
            message: e?.message,
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
  } catch (error: any) {
    const timedOut = error?.code === 'ECONNABORTED' || /timeout/i.test(error?.message || '');
    const status = error?.response?.status;
    const httpStatus = timedOut ? 504 : 500;
    const message = timedOut ? 'Quiz generation timed out. Please try again (or reduce question count).' : status ? `Quiz generation failed (${status})` : 'Quiz generation failed';
    return res.status(httpStatus).json({
      message,
      error: error?.message || String(error),
      data: error?.response?.data || null,
      trace: process.env.NODE_ENV === 'production' ? undefined : trace,
    });
  }
};
