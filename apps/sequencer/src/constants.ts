export const CB = {
  FINAL: 1,
  PENDING_SYNC: 0, // Default db value, waiting from value from overlord
  PENDING_COMPUTE: -1,
  PENDING_FINAL: -2,
  PENDING_DELETE: -3,
  INELIGIBLE: -10, // Payload format, can not compute
  ERROR_SYNC: -11 // Sync error from overlord, waiting for retry
};
