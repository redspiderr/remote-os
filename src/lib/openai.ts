export interface SummaryResult {
  summary: string;
  blockers: string[];
  action_items: string[];
  sentiment: 'positive' | 'neutral' | 'concerned';
  key_achievements: string[];
}

const SUMMARY_SYSTEM_PROMPT = `You are an engineering standup summarizer.
Read the transcript and return ONLY a JSON object with no markdown formatting, no code fences, and no extra commentary.

Return this exact shape:
{
  "summary": "2-3 sentence overview of what the person did, plans to do, and any notable context",
  "blockers": ["list of explicit blockers or dependencies the person mentioned, otherwise empty array"],
  "action_items": ["list of concrete next steps or tasks the person committed to, otherwise empty array"],
  "sentiment": "positive|neutral|concerned",
  "key_achievements": ["list of completed work or wins the person mentioned, otherwise empty array"]
}`;

export async function gpt4oChatCompletion<T>(systemPrompt: string, userContent: string): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.5,
      max_tokens: 1200,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  const content = data.choices?.[0]?.message?.content?.trim() ?? '';
  if (!content) {
    throw new Error('OpenAI returned empty content');
  }

  const cleaned = content
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    throw new Error(`Failed to parse OpenAI JSON: ${err instanceof Error ? err.message : String(err)}. Raw: ${content}`);
  }
}

export async function summarizeTranscript(transcript: string): Promise<SummaryResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
        { role: 'user', content: transcript },
      ],
      temperature: 0.4,
      max_tokens: 800,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  const content = data.choices?.[0]?.message?.content?.trim() ?? '';
  if (!content) {
    throw new Error('OpenAI returned empty summary content');
  }

  // Strip possible markdown fences
  const cleaned = content
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Failed to parse OpenAI JSON: ${err instanceof Error ? err.message : String(err)}. Raw: ${content}`);
  }

  // Validate shape
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.summary !== 'string') {
    throw new Error('OpenAI response missing "summary" field');
  }
  if (!Array.isArray(obj.blockers)) {
    throw new Error('OpenAI response missing "blockers" array');
  }
  if (!Array.isArray(obj.action_items)) {
    throw new Error('OpenAI response missing "action_items" array');
  }
  if (typeof obj.sentiment !== 'string') {
    throw new Error('OpenAI response missing "sentiment" field');
  }
  if (!Array.isArray(obj.key_achievements)) {
    throw new Error('OpenAI response missing "key_achievements" array');
  }

  const sentiment = obj.sentiment as string;
  if (!['positive', 'neutral', 'concerned'].includes(sentiment)) {
    throw new Error(`Invalid sentiment value: ${sentiment}`);
  }

  return {
    summary: obj.summary,
    blockers: obj.blockers.filter((b): b is string => typeof b === 'string'),
    action_items: obj.action_items.filter((a): a is string => typeof a === 'string'),
    sentiment: sentiment as SummaryResult['sentiment'],
    key_achievements: obj.key_achievements.filter((k): k is string => typeof k === 'string'),
  };
}
