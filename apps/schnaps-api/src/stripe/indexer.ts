import {
  BaseIndexer,
  BaseProvider,
  BlockNotFoundError
} from '@snapshot-labs/checkpoint';
import { capture } from '@snapshot-labs/snapshot-sentry';
import { stripe } from './client';
import { STRIPE_EVENTS, WINDOW } from './config';
import { createStripeWriters, StripeItem, StripeWriter } from './writers';

const FETCHERS: Record<
  string,
  (from: number, to: number) => Promise<StripeItem[]>
> = {
  [STRIPE_EVENTS.CHARGE]: (from, to) =>
    Array.fromAsync(
      stripe!.charges.list({ created: { gte: from, lt: to }, limit: 100 })
    ),
  [STRIPE_EVENTS.REFUND]: (from, to) =>
    Array.fromAsync(
      stripe!.refunds.list({ created: { gte: from, lt: to }, limit: 100 })
    ),
  // events.list retains only ~30 days, so cancellations are not replayable.
  [STRIPE_EVENTS.SUBSCRIPTION_UPDATED]: (from, to) =>
    Array.fromAsync(
      stripe!.events.list({
        type: STRIPE_EVENTS.SUBSCRIPTION_UPDATED,
        created: { gte: from, lt: to },
        limit: 100
      })
    ),
  [STRIPE_EVENTS.SUBSCRIPTION_DELETED]: (from, to) =>
    Array.fromAsync(
      stripe!.events.list({
        type: STRIPE_EVENTS.SUBSCRIPTION_DELETED,
        created: { gte: from, lt: to },
        limit: 100
      })
    )
};

type WindowData = Record<string, StripeItem[]>;

class StripeProvider extends BaseProvider {
  private cache = new Map<number, WindowData>();

  constructor(
    private args: ConstructorParameters<typeof BaseProvider>[0] & {
      writers: Record<string, StripeWriter>;
    }
  ) {
    super(args);
  }

  private get events(): { name: string; fn: string }[] {
    return (this.instance.config.sources ?? []).flatMap(s => s.events);
  }

  private async fetch(from: number, to: number): Promise<WindowData> {
    if (!stripe) return {};
    const lists = await Promise.all(
      this.events.map(e => FETCHERS[e.name](from, to))
    );
    return Object.fromEntries(this.events.map((e, i) => [e.name, lists[i]]));
  }

  formatAddresses(addresses: string[]): string[] {
    return addresses;
  }

  async getNetworkIdentifier(): Promise<string> {
    return 'stripe';
  }

  async getLatestBlockNumber(): Promise<number> {
    return ~~(Date.now() / 1000 / WINDOW);
  }

  async getBlockHash(blockNumber: number): Promise<string> {
    return String(blockNumber);
  }

  async processBlock(blockNumber: number): Promise<number> {
    if (blockNumber >= (await this.getLatestBlockNumber())) {
      throw new BlockNotFoundError(); // window still open
    }

    const data =
      this.cache.get(blockNumber) ??
      (await this.fetch(blockNumber * WINDOW, (blockNumber + 1) * WINDOW));
    this.cache.delete(blockNumber);

    for (const { name, fn } of this.events) {
      const items = data[name] ?? [];
      // Charges must run oldest-first: turbo accrues in payment order.
      if (name === STRIPE_EVENTS.CHARGE) {
        items.sort((a, b) => a.created - b.created);
      }
      for (const item of items) {
        try {
          await this.args.writers[fn](item);
        } catch (err) {
          capture(err);
          console.error(`[stripe] ${fn} failed`, item.id, err);
        }
      }
    }

    await this.instance.setBlockHash(blockNumber, String(blockNumber));
    await this.instance.setLastIndexedBlock(blockNumber);
    return blockNumber + 1;
  }

  async getCheckpointsRange(
    fromBlock: number,
    toBlock: number
  ): Promise<{ blockNumber: number; contractAddress: string }[]> {
    const data = await this.fetch(fromBlock * WINDOW, (toBlock + 1) * WINDOW);
    const windows = new Set<number>();

    for (const { name } of this.events) {
      for (const item of data[name] ?? []) {
        const block = ~~(item.created / WINDOW);
        windows.add(block);
        let bucket = this.cache.get(block);
        if (!bucket) this.cache.set(block, (bucket = {}));
        (bucket[name] ??= []).push(item);
      }
    }

    return [...windows].map(blockNumber => ({
      blockNumber,
      contractAddress: 'stripe'
    }));
  }
}

export class StripeIndexer extends BaseIndexer {
  constructor(
    private writers: Record<string, StripeWriter> = createStripeWriters()
  ) {
    super();
  }

  init(args: Parameters<BaseIndexer['init']>[0]): void {
    this.provider = new StripeProvider({ ...args, writers: this.writers });
  }

  getHandlers(): string[] {
    return Object.keys(this.writers);
  }
}
