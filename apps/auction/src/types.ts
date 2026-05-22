import { NotificationType } from '@snapshot-labs/tune';
import { VNode } from 'vue';

// UI
export type { NotificationType };

export type Theme = 'light' | 'dark';

export type NetworkID =
  | 's'
  | 's-tn'
  | 'eth'
  | 'matic'
  | 'arb1'
  | 'oeth'
  | 'base'
  | 'mnt'
  | 'bnb'
  | 'bnbt'
  | 'ape'
  | 'curtis'
  | 'sep'
  | 'sn'
  | 'sn-sep';

export type ChainId = number | string;

// UI
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

export type SelectItem<T> = {
  id: T;
  name?: string;
  icon?: VNode;
};
