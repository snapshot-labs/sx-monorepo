import { Choice } from '@/types';

export function getSdkChoice(choice: Choice): number {
  if (choice === 'for') return 1;
  if (choice === 'against') return 2;
  return 3;
}
