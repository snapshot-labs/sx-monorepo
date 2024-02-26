import { Choice } from '@/types';

const SCORE_URL = 'https://score.snapshot.org';

export function getSdkChoice(type: string, choice: Choice): number | number[] {
  if (type === 'basic') {
    if (choice === 'for') return 1;
    if (choice === 'against') return 2;
    return 3;
  }

  if (type === 'single-choice') {
    return choice as number;
  }

  if (type === 'approval') {
    return choice as number[];
  }

  throw new Error('Vote type not supported');
}

export async function fetchScoreApi(
  method: 'validate' | 'get_vp',
  params: Record<string, any>
): Promise<any> {
  try {
    const response = await fetch(SCORE_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method,
        params
      })
    });

    const body = await response.json();

    if (body.error) throw new Error(body.error.message);

    return body.result;
  } catch (e) {
    throw new Error('Failed to fetch score API');
  }
}
