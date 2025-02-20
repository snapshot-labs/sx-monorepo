import { promisifyAll } from 'bluebird';
import kbyte from 'kbyte';

promisifyAll(kbyte.Client.prototype);

export const client = new kbyte.Client(
  import.meta.env.VITE_PULSE_API || 'ws://localhost:3000'
);

setInterval(() => client.request('heartbeat', null), 10e3);
