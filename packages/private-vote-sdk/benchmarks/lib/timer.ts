/**
 * Minimal benchmarking helper. Runs `fn` `iterations` times, collects
 * wall-clock durations (ms), and returns aggregate statistics. Prints a
 * single-line summary as a side effect so results stream while the suite
 * runs.
 *
 * Deliberately ergonomic, not production-grade:
 * - No warm-up detection: the caller passes a `warmup` count.
 * - No GC forcing. Node's JIT stabilises after ~50 iters for our ops.
 * - `performance.now()` gives sub-ms resolution on Node ≥ 16.
 */

export interface BenchStats {
  name: string;
  iterations: number;
  mean: number;
  median: number;
  p95: number;
  min: number;
  max: number;
}

export interface BenchOpts {
  iterations: number;
  warmup?: number;
}

export async function bench(
  name: string,
  opts: BenchOpts,
  fn: () => void | Promise<void>,
): Promise<BenchStats> {
  const warmup = opts.warmup ?? Math.min(5, opts.iterations);
  for (let i = 0; i < warmup; i++) await fn();

  const samples: number[] = new Array(opts.iterations);
  for (let i = 0; i < opts.iterations; i++) {
    const t0 = performance.now();
    await fn();
    samples[i] = performance.now() - t0;
  }
  samples.sort((a, b) => a - b);

  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  const median = samples[Math.floor(samples.length / 2)]!;
  const p95 = samples[Math.max(0, Math.floor(samples.length * 0.95) - 1)]!;
  const stats: BenchStats = {
    name,
    iterations: opts.iterations,
    mean,
    median,
    p95,
    min: samples[0]!,
    max: samples[samples.length - 1]!,
  };

  // eslint-disable-next-line no-console
  console.log(
    `  ${pad(name, 44)} ${fmt(median)} ms (median)   p95 ${fmt(p95)} ms   ` +
      `mean ${fmt(mean)} ms   n=${opts.iterations}`,
  );
  return stats;
}

export function printTable(title: string, rows: Array<Record<string, string | number>>): void {
  if (rows.length === 0) return;
  const cols = Object.keys(rows[0]!);
  const widths = cols.map((c) =>
    Math.max(c.length, ...rows.map((r) => String(r[c]!).length)),
  );
  // eslint-disable-next-line no-console
  console.log(`\n${title}`);
  // eslint-disable-next-line no-console
  console.log(
    '| ' + cols.map((c, i) => c.padEnd(widths[i]!)).join(' | ') + ' |',
  );
  // eslint-disable-next-line no-console
  console.log(
    '|' + widths.map((w) => '-'.repeat(w + 2)).join('|') + '|',
  );
  for (const r of rows) {
    // eslint-disable-next-line no-console
    console.log(
      '| ' +
        cols.map((c, i) => String(r[c]!).padEnd(widths[i]!)).join(' | ') +
        ' |',
    );
  }
}

function fmt(ms: number): string {
  if (ms >= 100) return ms.toFixed(1).padStart(7);
  if (ms >= 1) return ms.toFixed(2).padStart(7);
  return ms.toFixed(3).padStart(7);
}

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}
