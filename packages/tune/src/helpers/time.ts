export function partitionDuration(s: number) {
  const SECONDS_TO_DAYS = 60 * 60 * 24;
  const SECONDS_TO_HOURS = 60 * 60;
  const SECONDS_TO_MINUTES = 60;

  const days = Math.floor(s / SECONDS_TO_DAYS);
  const hours = Math.floor((s - days * SECONDS_TO_DAYS) / SECONDS_TO_HOURS);
  const minutes = Math.floor(
    (s - days * SECONDS_TO_DAYS - hours * SECONDS_TO_HOURS) / SECONDS_TO_MINUTES
  );
  const seconds =
    s -
    days * SECONDS_TO_DAYS -
    hours * SECONDS_TO_HOURS -
    minutes * SECONDS_TO_MINUTES;

  return {
    days,
    hours,
    minutes,
    seconds
  };
}
