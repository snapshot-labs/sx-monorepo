export type NotificationType = 'error' | 'warning' | 'success';

export interface FieldDefinition<T = unknown> {
  title?: string;
  description?: string;
  tooltip?: string;
  default?: T;
  examples?: unknown[];
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  type?: string | string[];
  format?: string;
  enum?: unknown[];
  items?: FieldDefinition;
  properties?: Record<string, FieldDefinition>;
  required?: string[];
  maxItems?: number;
  minItems?: number;
  [key: string]: unknown;
}

export type ObjectFieldDefinition = FieldDefinition<Record<string, unknown>> & {
  type: string;
  properties: Record<string, FieldDefinition & { type: string | string[] }>;
};

export type ArrayFieldDefinition<T = unknown> = FieldDefinition<T[]> & {
  type: string;
  items: FieldDefinition & { type: string | string[] };
};

export type FormComponentResolver = (
  property: FieldDefinition
) => Component | null;

export type SelectItem<T> = {
  id: T;
  name?: string;
  icon?: Component;
};

type WithOptions<T> = {
  enum: T[];
  options: SelectItem<T>[];
};

export type FieldDefinitionWithOptions<T> = FieldDefinition<T> & WithOptions<T>;

export type FieldDefinitionWithMultipleOptions<T> = FieldDefinition<T[]> &
  WithOptions<T>;

export type Step = {
  title: string;
  isValid: () => boolean;
};

export type StepRecords = Record<string, Step>;
