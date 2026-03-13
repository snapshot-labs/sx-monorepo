import { ALIASES_CONFIG, TOWNHALL_CONFIG } from '@snapshot-labs/sx';
import Aliases from './aliases';
import Townhall from './townhall';
import Process from '../highlight/process';

export const AGENTS_MAP = {
  [ALIASES_CONFIG.address]: (process: Process) => {
    return new Aliases('aliases', process);
  },
  [TOWNHALL_CONFIG.address]: (process: Process) => {
    return new Townhall('townhall', process);
  }
};
