import winston from 'winston';

const log = winston.createLogger({
  transports: new winston.transports.Console({
    format: winston.format.combine(
      // Without this, passing an Error to `log.error` drops the stack
      // (Error props are non-enumerable, so they don't serialize). With
      // it, `log.error('msg', err)` includes the full stack trace.
      winston.format.errors({ stack: true }),
      winston.format.colorize(),
      winston.format.simple()
    )
  })
});

export default log;
