import { CONFIDENCE_LEVELS, MODEL, OPENROUTER_API_KEY } from '../config';

const URL = 'https://openrouter.ai/api/v1/chat/completions';

const MAX_RETRIES = 3;

export type Prediction = {
  choice: string;
  confidence: (typeof CONFIDENCE_LEVELS)[number];
  reasoning: string;
};

type Completion = {
  choices?: { message: { content: string } }[];
  usage?: { cost?: number };
  error?: { message: string };
};

function responseFormat(choices: string[]) {
  return {
    type: 'json_schema',
    json_schema: {
      name: 'vote_prediction',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          choice: {
            type: 'string',
            enum: choices,
            description: 'the option this person would pick, word for word'
          },
          confidence: { type: 'string', enum: [...CONFIDENCE_LEVELS] },
          reasoning: {
            type: 'string',
            description:
              "why this option, in the voter's own words and first person"
          }
        },
        required: ['choice', 'confidence', 'reasoning'],
        additionalProperties: false
      }
    }
  };
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * The proposal reads the same for every voter on it, so it is sent as its own
 * leading block with a cache breakpoint. The other voters on that proposal
 * then read it from cache instead of paying for it again.
 */
export async function predictVote({
  system,
  proposal,
  instructions,
  choices
}: {
  system: string;
  proposal: string;
  instructions: string;
  choices: string[];
}): Promise<{ prediction: Prediction; cost: number }> {
  const body = {
    model: MODEL,
    response_format: responseFormat(choices),
    messages: [
      { role: 'system', content: system },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: proposal,
            cache_control: { type: 'ephemeral' }
          },
          { type: 'text', text: instructions }
        ]
      }
    ]
  };

  for (let attempt = 0; ; attempt++) {
    const res = await fetch(URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENROUTER_API_KEY}`
      },
      body: JSON.stringify(body)
    });

    if (res.status === 429 || res.status >= 500) {
      if (attempt >= MAX_RETRIES) {
        throw new Error(`model call failed with status ${res.status}`);
      }

      const retryAfter = Number(res.headers.get('retry-after')) || 2 ** attempt;
      await sleep(retryAfter * 1000);
      continue;
    }

    const json = (await res.json()) as Completion;
    if (!res.ok || json.error) {
      throw new Error(
        json.error?.message ?? `model call failed with status ${res.status}`
      );
    }

    const content = json.choices?.[0]?.message.content;
    if (!content) throw new Error('model returned no content');

    return {
      prediction: JSON.parse(content) as Prediction,
      cost: json.usage?.cost ?? 0
    };
  }
}
