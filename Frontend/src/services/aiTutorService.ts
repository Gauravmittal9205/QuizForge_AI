const OLLAMA_BASE_URL =
  (import.meta as any)?.env?.VITE_OLLAMA_BASE_URL?.toString?.() || 'http://localhost:11434';
const OLLAMA_GENERATE_URL = `${OLLAMA_BASE_URL}/api/generate`;
const OLLAMA_CHAT_URL = `${OLLAMA_BASE_URL}/api/chat`;
const OLLAMA_TAGS_URL = `${OLLAMA_BASE_URL}/api/tags`;

const OLLAMA_REQUEST_TIMEOUT_MS =
  Number((import.meta as any)?.env?.VITE_OLLAMA_REQUEST_TIMEOUT_MS) || 180000;

const OLLAMA_KEEP_ALIVE =
  (import.meta as any)?.env?.VITE_OLLAMA_KEEP_ALIVE?.toString?.() || '10m';

const OLLAMA_NUM_PREDICT =
  Number((import.meta as any)?.env?.VITE_OLLAMA_NUM_PREDICT) || 512;

const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  timeoutMs: number
) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const externalSignal = init?.signal;
  const onAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', onAbort, { once: true });
    }
  }

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
    if (externalSignal) {
      try {
        externalSignal.removeEventListener('abort', onAbort);
      } catch {
        // ignore
      }
    }
  }
};

const parseNdjsonStream = async (
  response: Response,
  onJson: (obj: any) => void
): Promise<void> => {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let index;
    while ((index = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      if (!line) continue;
      try {
        onJson(JSON.parse(line));
      } catch {
        // ignore malformed lines
      }
    }
  }

  const tail = buffer.trim();
  if (tail) {
    try {
      onJson(JSON.parse(tail));
    } catch {
      // ignore
    }
  }
};

export const sendMessageToAIStream = async (
  message: string,
  opts: {
    model?: string;
    context?: number[];
    onDelta?: (delta: string) => void;
    signal?: AbortSignal;
  } = {}
): Promise<{ response: string; newContext: number[]; doneReason?: string | null }> => {
  const model = opts.model ?? 'llama2';
  const context = opts.context ?? [];
  let fullText = '';
  let newContext = context;
  let doneReason: string | null | undefined;

  try {
    const response = await fetchWithTimeout(
      OLLAMA_GENERATE_URL,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt: message,
          context,
          stream: true,
          keep_alive: OLLAMA_KEEP_ALIVE,
          options: {
            num_predict: OLLAMA_NUM_PREDICT,
          },
        }),
        signal: opts.signal,
      },
      OLLAMA_REQUEST_TIMEOUT_MS
    );

    if (response.status === 404) {
      const chatResponse = await fetchWithTimeout(
        OLLAMA_CHAT_URL,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: message }],
            context: context.length ? context : undefined,
            stream: true,
            keep_alive: OLLAMA_KEEP_ALIVE,
            options: {
              num_predict: OLLAMA_NUM_PREDICT,
            },
          }),
          signal: opts.signal,
        },
        OLLAMA_REQUEST_TIMEOUT_MS
      );

      if (!chatResponse.ok) {
        throw await buildHttpError(chatResponse);
      }

      await parseNdjsonStream(chatResponse, (obj: OllamaChatStreamChunk) => {
        const delta = obj?.message?.content ?? '';
        if (delta) {
          fullText += delta;
          opts.onDelta?.(delta);
        }
        if (Array.isArray(obj?.context)) {
          newContext = obj.context;
        }

        if (obj?.done) {
          doneReason = obj?.done_reason;
        }
      });

      return { response: fullText, newContext, doneReason };
    }

    if (!response.ok) {
      throw await buildHttpError(response);
    }

    await parseNdjsonStream(response, (obj: OllamaGenerateStreamChunk) => {
      const delta = obj?.response ?? '';
      if (delta) {
        fullText += delta;
        opts.onDelta?.(delta);
      }
      if (Array.isArray(obj?.context)) {
        newContext = obj.context;
      }

      if (obj?.done) {
        doneReason = obj?.done_reason;
      }
    });

    return { response: fullText, newContext, doneReason };
  } catch (error) {
    console.error('Error calling Ollama API:', error);
    if ((error as any)?.name === 'AbortError') {
      throw new Error('AI request canceled.');
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to get response from AI.');
  }
};

type OllamaGenerateResponse = {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  done_reason: string | null;
  context: number[];
  total_duration: number;
  load_duration: number;
  prompt_eval_count: number;
  prompt_eval_duration: number;
  eval_count: number;
  eval_duration: number;
};

type OllamaChatResponse = {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  done_reason: string | null;
  context?: number[];
};

type OllamaTagsResponse = {
  models?: Array<{ name?: string; model?: string } | string>;
};

type OllamaGenerateStreamChunk = {
  response?: string;
  done?: boolean;
  done_reason?: string | null;
  context?: number[];
};

type OllamaChatStreamChunk = {
  message?: { content?: string };
  done?: boolean;
  done_reason?: string | null;
  context?: number[];
};

const buildHttpError = async (response: Response) => {
  const text = await response.text().catch(() => '');
  const suffix = text ? ` - ${text.slice(0, 500)}` : '';
  return new Error(`Error from Ollama API: ${response.status} ${response.statusText}${suffix}`);
};

export const sendMessageToAI = async (
  message: string,
  model: string = 'llama2',
  context: number[] = []
): Promise<{ response: string; newContext: number[]; doneReason?: string | null }> => {
  try {
    const response = await fetchWithTimeout(
      OLLAMA_GENERATE_URL,
      {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt: message,
        context,
        stream: false,
        keep_alive: OLLAMA_KEEP_ALIVE,
        options: {
          num_predict: OLLAMA_NUM_PREDICT,
        },
      }),
      },
      OLLAMA_REQUEST_TIMEOUT_MS
    );

    if (response.status === 404) {
      const chatResponse = await fetchWithTimeout(
        OLLAMA_CHAT_URL,
        {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: message }],
          context: context.length ? context : undefined,
          stream: false,
          keep_alive: OLLAMA_KEEP_ALIVE,
          options: {
            num_predict: OLLAMA_NUM_PREDICT,
          },
        }),
        },
        OLLAMA_REQUEST_TIMEOUT_MS
      );

      if (!chatResponse.ok) {
        throw await buildHttpError(chatResponse);
      }

      const data: OllamaChatResponse = await chatResponse.json();
      return {
        response: data.message?.content ?? '',
        newContext: data.context ?? context,
      };
    }

    if (!response.ok) {
      throw await buildHttpError(response);
    }

    const data: OllamaGenerateResponse = await response.json();
    return {
      response: data.response,
      newContext: data.context,
      doneReason: data.done_reason,
    };
  } catch (error) {
    console.error('Error calling Ollama API:', error);
    if ((error as any)?.name === 'AbortError') {
      throw new Error(
        'AI request timed out. If this is your first message after selecting a model, Ollama may be loading the model. Please wait 30-90 seconds and try again.'
      );
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Failed to get response from AI.');
  }
};

export const checkOllamaStatus = async (): Promise<boolean> => {
  try {
    const response = await fetchWithTimeout(OLLAMA_TAGS_URL, undefined, 8000);
    if (!response.ok) return false;

    const data = await response.json().catch(() => null);
    return Boolean(data && Array.isArray((data as any).models));
  } catch (error) {
    return false;
  }
};

export const getOllamaModels = async (): Promise<string[]> => {
  const response = await fetchWithTimeout(OLLAMA_TAGS_URL, undefined, 8000);
  if (!response.ok) {
    throw await buildHttpError(response);
  }

  const data: OllamaTagsResponse | null = await response.json().catch(() => null);
  const rawModels = Array.isArray(data?.models) ? data?.models : [];

  return rawModels
    .map((m) => (typeof m === 'string' ? m : m?.name || m?.model))
    .filter((m): m is string => Boolean(m));
};
