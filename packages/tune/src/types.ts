export type NotificationType = 'error' | 'warning' | 'success';

export type StepRecords = Record<
  string,
  {
    title: string;
    isValid: () => boolean;
  }
>;
