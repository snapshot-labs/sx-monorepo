import { Choice } from '@/types';

const SCORE_URL = 'https://score.snapshot.org';

export function getSdkChoice(choice: Choice): number {
  if (choice === 'for') return 1;
  if (choice === 'against') return 2;
  return 3;
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
