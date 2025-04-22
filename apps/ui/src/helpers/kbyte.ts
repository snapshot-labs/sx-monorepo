import kbyte from 'kbyte';

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

export const client = new kbyte.Client(
  import.meta.env.VITE_PULSE_API || 'ws://localhost:3000'
);

setInterval(() => client.request('heartbeat', null), 10e3);
