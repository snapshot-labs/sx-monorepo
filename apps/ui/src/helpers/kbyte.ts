import kbyte from 'kbyte';
import { HIGHLIGHT_WS } from '@/helpers/highlight';

Object.getOwnPropertyNames(kbyte.Client.prototype)
  .filter(
    method =>
      typeof kbyte.Client.prototype[method] === 'function' &&
      method !== 'constructor'
  )
  .forEach(method => {
    kbyte.Client.prototype[`${method}Async`] = function (...args) {
      return new Promise((resolve, reject) => {
        this[method](...args, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        });
      });
    };
  });

export const client = new kbyte.Client(HIGHLIGHT_WS);

setInterval(() => client.request('heartbeat', null), 10e3);
