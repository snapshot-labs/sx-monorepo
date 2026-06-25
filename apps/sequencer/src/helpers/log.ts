import winston from 'winston';

const log = winston.createLogger({
  transports: new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }),
  silent: process.env.NODE_ENV === 'test'
});

export default log;
