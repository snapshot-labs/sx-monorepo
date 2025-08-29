import pino from 'pino';

const LOGTAIL_HOST = process.env.LOGTAIL_HOST;
const LOGTAIL_TOKEN = process.env.LOGTAIL_TOKEN;

function getPinoTransport(): pino.LoggerOptions {
  if (LOGTAIL_HOST && LOGTAIL_TOKEN) {
    return pino.transport({
      target: '@logtail/pino',
      options: {
        sourceToken: LOGTAIL_TOKEN,
        options: {
          endpoint: `https://${LOGTAIL_HOST}`
        }
      }
    });
  }

  if (process.env.NODE_ENV !== 'production') {
    return pino.transport({
      target: 'pino-pretty'
    });
  }

  return {};
}

export default pino(getPinoTransport());
