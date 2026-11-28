import type { VNode } from 'vue';

export type NotificationType = 'error' | 'warning' | 'success';

export type Theme = 'light' | 'dark';

export type SelectItem<T> = {
  id: T;
  name?: string;
  icon?: VNode;
};

export type BaseDefinition<T> = {
  type: string | string[];
  format?: string;
  title: string;
  description?: string;
  default?: T;
  examples?: string[];
  tooltip?: string;
};

export type DefinitionWithOptions<T> = BaseDefinition<T> & {
  enum: T[];
  options: SelectItem<T>[];
};

export type DefinitionWithMultipleOptions<T> = BaseDefinition<T[]> & {
  enum: T[];
  options: SelectItem<T>[];
};

export type Step = {
  title: string;
  isValid: () => boolean;
};

export type StepRecords = Record<string, Step>;
