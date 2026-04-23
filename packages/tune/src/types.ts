export type NotificationType = 'error' | 'warning' | 'success';

export type Step = {
  title: string;
  isValid: () => boolean;
};

export type StepRecords = Record<string, Step>;
