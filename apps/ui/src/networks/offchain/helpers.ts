import { Choice } from '@/types';

export function getSdkChoice(type: string, choice: Choice): number | number[] {
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

  throw new Error('Vote type not supported');
}
