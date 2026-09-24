import { sha256 } from './utils';

const DAY_IN_SECONDS = 24 * 60 * 60;
const DEFAULT_CUTOFF_DAYS = 365;

type HistoricalAccessMode = 'off' | 'observe' | 'enforce';
type HistoricalAccessKeyState = 'anonymous' | 'keyed' | 'entitled' | 'internal';
export type HistoricalAccessRequestClass =
  | 'recent_bounded'
  | 'explicit_history'
  | 'unbounded';
type HistoricalAccessOutcome = 'allowed' | 'observed' | 'restricted';

export type HistoricalAccessConfig = {
  mode: HistoricalAccessMode;
  cutoffDays: number;
  entitledKeyHashes: Set<string>;
  internalKey?: string;
};

type HistoricalAccessResponse = {
  locals?: { keycardData?: { valid?: boolean } };
  getHeader?: (name: string) => number | string | string[] | undefined;
  setHeader?: (
    name: string,
    value: number | string | readonly string[]
  ) => unknown;
};

export type HistoricalAccessContext = {
  mode: HistoricalAccessMode;
  cutoff: number;
  keyState: HistoricalAccessKeyState;
  isEntitled: boolean;
  onGated?: () => void;
  onRestricted?: () => void;
};

type HistoricalAccessMetric = {
  resource: string;
  key_state: HistoricalAccessKeyState;
  request_class: HistoricalAccessRequestClass;
  mode: HistoricalAccessMode;
  outcome: HistoricalAccessOutcome;
};

type HistoricalAccessRecorder = (metric: HistoricalAccessMetric) => void;

let recordAccess: HistoricalAccessRecorder = () => undefined;

export function setHistoricalAccessRecorder(
  recorder?: HistoricalAccessRecorder
) {
  recordAccess = recorder ?? (() => undefined);
}

function parseMode(value?: string): HistoricalAccessMode {
  const normalized = value?.trim();
  if (!normalized) return 'off';
  if (
    normalized === 'off' ||
    normalized === 'observe' ||
    normalized === 'enforce'
  ) {
    return normalized;
  }
  throw new Error(
    'HISTORICAL_DATA_ACCESS_MODE must be off, observe, or enforce'
  );
}

function parseCutoffDays(value?: string): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_CUTOFF_DAYS;
}

function parseKeyHashes(value?: string): Set<string> {
  return new Set(
    (value ?? '')
      .split(',')
      .map(hash => hash.trim().toLowerCase())
      .filter(hash => /^[a-f0-9]{64}$/.test(hash))
  );
}

export function getHistoricalAccessConfig(
  env: NodeJS.ProcessEnv = process.env
): HistoricalAccessConfig {
  return {
    mode: parseMode(env.HISTORICAL_DATA_ACCESS_MODE),
    cutoffDays: parseCutoffDays(env.HISTORICAL_DATA_CUTOFF_DAYS),
    entitledKeyHashes: parseKeyHashes(env.HISTORICAL_DATA_API_KEY_HASHES),
    internalKey: env.KEYCARD_SECRET || undefined
  };
}

function getApiKey(req): string | undefined {
  const headerKey = req?.headers?.['x-api-key'];
  if (typeof headerKey === 'string' && headerKey.trim()) {
    return headerKey.trim();
  }
  if (Array.isArray(headerKey) && headerKey[0]?.trim()) {
    return headerKey[0].trim();
  }

  const queryKey = req?.query?.apiKey;
  if (typeof queryKey === 'string' && queryKey.trim()) {
    return queryKey.trim();
  }
  return undefined;
}

export function getHistoricalAccessContext(
  req,
  response?: HistoricalAccessResponse,
  options: {
    config?: HistoricalAccessConfig;
    now?: number;
  } = {}
): HistoricalAccessContext {
  const config = options.config ?? getHistoricalAccessConfig();
  const now = options.now ?? Math.floor(Date.now() / 1000);
  const cutoff = now - config.cutoffDays * DAY_IN_SECONDS;

  if (config.mode === 'off') {
    return {
      mode: 'off',
      cutoff,
      keyState: 'anonymous',
      isEntitled: false
    };
  }

  const apiKey = getApiKey(req);
  const hasValidKey = response?.locals?.keycardData?.valid === true;
  const isInternal = Boolean(
    apiKey && config.internalKey && apiKey === config.internalKey
  );
  const hasEntitledHash = Boolean(
    apiKey &&
      hasValidKey &&
      config.entitledKeyHashes.has(sha256(apiKey).toLowerCase())
  );
  const keyState: HistoricalAccessKeyState = isInternal
    ? 'internal'
    : hasEntitledHash
      ? 'entitled'
      : hasValidKey
        ? 'keyed'
        : 'anonymous';

  const onGated = () => {
    const vary = response?.getHeader?.('Vary');
    const values = Array.isArray(vary)
      ? vary
      : String(vary ?? '')
          .split(',')
          .map(value => value.trim())
          .filter(Boolean);
    if (
      !values.includes('*') &&
      !values.some(value => value.toLowerCase() === 'x-api-key')
    ) {
      response?.setHeader?.('Vary', [...values, 'X-Api-Key'].join(', '));
    }
    response?.setHeader?.('Cache-Control', 'private, no-store');
  };
  const onRestricted = () => {
    onGated();
    response?.setHeader?.('X-Historical-Data-Access', 'restricted');
    response?.setHeader?.('X-Historical-Data-Cutoff', cutoff.toString());
  };

  return {
    mode: config.mode,
    cutoff,
    keyState,
    isEntitled: isInternal || hasEntitledHash,
    onGated: config.mode === 'enforce' ? onGated : undefined,
    onRestricted: config.mode === 'enforce' ? onRestricted : undefined
  };
}

function toFiniteNumbers(value: unknown): number[] {
  const values = Array.isArray(value) ? value : [value];
  return values.filter(
    (candidate): candidate is number =>
      typeof candidate === 'number' && Number.isFinite(candidate)
  );
}

export function classifyHistoricalRequest(
  where: Record<string, unknown> = {},
  cutoff: number,
  timestampField = 'created'
): HistoricalAccessRequestClass {
  const exact = toFiniteNumbers(where[timestampField]);
  const included = toFiniteNumbers(where[`${timestampField}_in`]);
  const gte = toFiniteNumbers(where[`${timestampField}_gte`]);
  const gt = toFiniteNumbers(where[`${timestampField}_gt`]);
  const upperBounds = [
    ...toFiniteNumbers(where[`${timestampField}_lte`]),
    ...toFiniteNumbers(where[`${timestampField}_lt`])
  ];

  if (
    exact.some(value => value < cutoff) ||
    included.some(value => value < cutoff) ||
    gte.some(value => value < cutoff) ||
    gt.some(value => value < cutoff)
  ) {
    return 'explicit_history';
  }

  if (
    exact.some(value => value >= cutoff) ||
    (included.length > 0 && included.every(value => value >= cutoff)) ||
    gte.some(value => value >= cutoff) ||
    gt.some(value => value >= cutoff)
  ) {
    return 'recent_bounded';
  }

  // An upper bound alone still permits every row before the cutoff.
  if (upperBounds.length > 0) return 'explicit_history';

  return 'unbounded';
}

function record(
  context: HistoricalAccessContext,
  resource: string,
  requestClass: HistoricalAccessRequestClass,
  outcome: HistoricalAccessOutcome
) {
  if (context.mode === 'off') return;
  recordAccess({
    resource,
    key_state: context.keyState,
    request_class: requestClass,
    mode: context.mode,
    outcome
  });
}

function markRestricted(context: HistoricalAccessContext) {
  context.onRestricted?.();
}

export function applyHistoricalCollectionBoundary(
  args: Record<string, any>,
  context: HistoricalAccessContext | undefined,
  resource: string,
  timestampField = 'created'
): Record<string, any> {
  if (!context || context.mode === 'off') return args;

  const where = args.where ?? {};
  const requestClass = classifyHistoricalRequest(
    where,
    context.cutoff,
    timestampField
  );

  if (context.mode === 'observe') {
    record(context, resource, requestClass, 'observed');
    return args;
  }

  context.onGated?.();

  if (context.isEntitled) {
    record(context, resource, requestClass, 'allowed');
    return args;
  }

  if (requestClass === 'recent_bounded') {
    record(context, resource, requestClass, 'allowed');
    return args;
  }

  const restrictedWhere = {
    ...where,
    [`${timestampField}_gte`]: context.cutoff
  };
  markRestricted(context);
  record(context, resource, requestClass, 'restricted');
  return { ...args, where: restrictedWhere };
}

export function enforceHistoricalEntityBoundary(
  timestamp: unknown,
  context: HistoricalAccessContext | undefined,
  resource: string
): boolean {
  if (!context || context.mode === 'off') return true;

  const hasValidTimestamp =
    typeof timestamp === 'number' && Number.isFinite(timestamp);
  const requestClass: HistoricalAccessRequestClass = !hasValidTimestamp
    ? 'unbounded'
    : timestamp < context.cutoff
      ? 'explicit_history'
      : 'recent_bounded';

  if (context.mode === 'observe') {
    record(context, resource, requestClass, 'observed');
    return true;
  }

  context.onGated?.();
  if (context.isEntitled) {
    record(context, resource, requestClass, 'allowed');
    return true;
  }
  if (!hasValidTimestamp || timestamp < context.cutoff) {
    markRestricted(context);
    record(context, resource, requestClass, 'restricted');
    return false;
  }
  record(context, resource, requestClass, 'allowed');
  return true;
}
