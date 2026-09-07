import { capture } from '@snapshot-labs/snapshot-sentry';

// The task owns its normal polling loop. Restart it after a failure, without
// leaving a rejected promise unhandled or retrying in a tight loop.
export default function startBackgroundTask(
  name: string,
  task: () => Promise<void>,
  retryDelay = 10e3
): () => void {
  let isStopped = false;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  async function run() {
    try {
      await task();
    } catch (err) {
      capture(err, { tags: { task: name } });
      if (!isStopped) retryTimer = setTimeout(run, retryDelay);
    }
  }

  run();

  // An in-flight task still finishes; shutdown must not start another attempt.
  return () => {
    isStopped = true;
    clearTimeout(retryTimer);
  };
}
