import Aliases from './aliases';
import Townhall from './townhall';
import Process from '../highlight/process';

export const AGENTS_MAP = {
  '0x0000000000000000000000000000000000000001': (process: Process) => {
    return new Aliases('aliases', process);
  },
  '0x0000000000000000000000000000000000000002': (process: Process) => {
    return new Townhall('townhall', process);
  }
};
