export const CB = {
  FINAL: 1,
  PENDING_SYNC: 0, // Default db value, waiting from value from overlord
  PENDING_COMPUTE: -1,
  PENDING_FINAL: -2,
  PENDING_DELETE: -3,
  INELIGIBLE: -10, // Payload format, can not compute
  ERROR_SYNC: -11 // Sync error from overlord, waiting for retry
};

// Points are only earned for ledger entries created at or after this timestamp
export const POINTS_START_TIMESTAMP = parseInt(
  process.env.POINTS_START_TIMESTAMP ?? '1785542400' // 2026-08-01 00:00:00 UTC
);
