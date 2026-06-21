import pino from 'pino';

const prettifyLogs = process.env.NODE_ENV !== 'production';

const LOGTAIL_HOST = process.env.LOGTAIL_HOST;
const LOGTAIL_TOKEN = process.env.LOGTAIL_TOKEN;

// The `err` serializer flattens an error's own enumerable properties into the
// log record, so a Coinbase CDP `APIError` surfaces its `errorType`,
// `statusCode` and `correlationId` as queryable fields in Better Stack.
const base = {
  level: process.env.LOG_LEVEL ?? 'info',
  serializers: { err: pino.stdSerializers.err }
};

function createLogger(): pino.Logger {
  if (LOGTAIL_HOST && LOGTAIL_TOKEN) {
    return pino({
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
    });
  }

  // Write to stderr (fd 2) rather than stdout: under the stdio transport,
  // stdout carries the JSON-RPC stream and must not be polluted with logs.
  if (prettifyLogs) {
    return pino({
      ...base,
      transport: {
        target: 'pino-pretty',
        options: { destination: 2 }
      }
    });
  }

  return pino(base, pino.destination(2));
}

export default createLogger();
