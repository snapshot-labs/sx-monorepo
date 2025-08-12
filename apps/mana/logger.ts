import pino from 'pino';

const options: pino.LoggerOptions =
  process.env.NODE_ENV !== 'production'
    ? {
        transport: {
          target: 'pino-pretty'
        }
      }
    : {};

export default pino(options);
