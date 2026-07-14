import pino from 'pino';

const prettifyLogs = process.env.NODE_ENV !== 'production';

const LOGTAIL_HOST = process.env.LOGTAIL_HOST;
const LOGTAIL_TOKEN = process.env.LOGTAIL_TOKEN;

function getPinoOptions() {
  if (LOGTAIL_HOST && LOGTAIL_TOKEN) {
    return {
      transport: {
        target: '@logtail/pino',
        options: {
          sourceToken: LOGTAIL_TOKEN,
          options: {
            endpoint: `https://${LOGTAIL_HOST}`
          }
        }
      }
    };
  }

  if (prettifyLogs) {
    return {
      transport: {
        target: 'pino-pretty'
      }
    };
  }

  return {};
}

export const pinoOptions = getPinoOptions();

export default pino(pinoOptions);
