import init, { client } from '@snapshot-labs/snapshot-metrics';
import { capture } from '@snapshot-labs/snapshot-sentry';
import { Express } from 'express';
import { queue } from './duplicateRequestPreventor';
import db from './mysql';

const whitelistedPath = [/^\/$/, /^\/scores\/.+$/, /^\/spaces\/.+\/poke$/];

const rateLimitedRequestsCount = new client.Counter({
  name: 'http_requests_by_rate_limit_count',
  help: 'Total number of requests, by rate limit status',
  labelNames: ['rate_limited']
});

function instrumentRateLimitedRequests(req, res, next) {
  res.on('finish', () => {
    if (whitelistedPath.some(path => path.test(req.path))) {
      rateLimitedRequestsCount.inc({
        rate_limited: res.statusCode === 429 ? 1 : 0
      });
    }
  });

  next();
}

export default function initMetrics(app: Express) {
  init(app, {
    normalizedPath: [
      ['/scores/.+', '/scores/#id'],
      ['/spaces/.+/poke', '/spaces/#key/poke']
    ],
    whitelistedPath,
    errorHandler: capture,
    db
  });

  app.use(instrumentRateLimitedRequests);
  app.use(ingestorInstrumentation);
}

export const timeIngestorProcess = new client.Histogram({
  name: 'ingestor_process_duration_seconds',
  help: 'Duration in seconds of each ingestor process',
  labelNames: ['type', 'status', 'network']
});

const timeIngestorErrorProcess = new client.Histogram({
  name: 'ingestor_error_process_duration_seconds',
  help: 'Duration in seconds of each ingestor failed process.',
  labelNames: ['error', 'type']
});

export const requestDeduplicatorSize = new client.Gauge({
  name: 'request_deduplicator_size',
  help: 'Total number of items in the deduplicator queue'
});

const ingestorInstrumentation = (req, res, next) => {
  if (req.method !== 'POST' && req.originalUrl !== '/') {
    return next();
  }

  const endTimer = timeIngestorErrorProcess.startTimer();
  const oldJson = res.json;

  res.json = body => {
    if (
      res.statusCode >= 400 &&
      res.statusCode < 500 &&
      res.statusCode !== 429 &&
      body
    ) {
      endTimer({
        type: Object.keys(req.body?.data?.types || {})[0],
        error: body.error_description
      });
    }

    res.locals.body = body;
    return oldJson.call(res, body);
  };

  next();
};

export const monitoringBlockedRequestsCount = new client.Counter({
  name: 'monitoring_blocked_requests_count',
  help: 'Total number of requests rejected by monitoring service, by space and service',
  labelNames: ['space', 'service']
});

new client.Gauge({
  name: 'duplicate_request_queue_size',
  help: 'Number of items in the duplicate requests prevention queue',
  async collect() {
    this.set(queue.size);
  }
});
