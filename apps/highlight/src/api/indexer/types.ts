import { BaseWriterParams } from '@snapshot-labs/checkpoint';
import { Event, Unit } from '../../highlight/types';

export type Writer = (
  args: {
    unit: Unit;
    payload: Event;
  } & BaseWriterParams
) => Promise<void>;
