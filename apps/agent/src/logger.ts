import pino from 'pino';

const prettifyLogs = process.env.NODE_ENV !== 'production';

const LOGTAIL_HOST = process.env.LOGTAIL_HOST;
const LOGTAIL_TOKEN = process.env.LOGTAIL_TOKEN;

function getPinoOptions() {
  const base = {
    level: process.env.LOG_LEVEL ?? 'info',
    serializers: { err: pino.stdSerializers.err }
  };

  if (LOGTAIL_HOST && LOGTAIL_TOKEN) {
    return {
      ...base,
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
      ...base,
      transport: {
        target: 'pino-pretty'
      }
    };
  }

  return base;
}

export default pino(getPinoOptions());
