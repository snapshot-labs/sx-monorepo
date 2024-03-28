import { Choice } from '@/types';

export function getSdkChoice(
  type: string,
  choice: Choice
): number | number[] | Record<string, number> {
  if (type === 'basic') {
    if (choice === 'for') return 1;
    if (choice === 'against') return 2;
    return 3;
  }

  if (type === 'single-choice') {
    return choice as number;
  }

  if (type === 'approval' || type === 'ranked-choice') {
    return choice as number[];
  }

  if (['weighted', 'quadratic'].includes(type)) {
    return choice as Record<string, number>;
  }

  throw new Error('Vote type not supported');
}
