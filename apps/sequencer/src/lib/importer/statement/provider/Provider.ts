import snapshot from '@snapshot-labs/snapshot.js';
import { Delegate } from '../';
import hubDB from '../../../../helpers/mysql';
import { sha256 } from '../../../../helpers/utils';

export class Provider {
  spaceId: string;
  delegates: Delegate[];

  // Time in seconds between each request, 0 to disable
  throttle_interval = 0;

  constructor(spaceId: string) {
    this.spaceId = spaceId;
    this.delegates = [];
  }

  async fetch(): Promise<Delegate[]> {
    await this._fetch();

    console.log(
      `[${this.getId()}] ${this.spaceId} - ✅ Found ${
        Object.keys(this.delegates).length
      } delegate(s) with statement`
    );

    return this.delegates;
  }

  async _fetch() {}

  formatDelegate(result: { delegate: string; statement: string }): Delegate {
    const [network, space] = this.spaceId.split(':');
    const now = Math.floor(new Date().getTime() / 1000);

    return {
      id: sha256([result.delegate, result.statement, space, network].join('')),
      delegate: snapshot.utils.getFormattedAddress(
        result.delegate,
        snapshot.utils.isEvmAddress(result.delegate) ? 'evm' : 'starknet'
      ),
      statement: result.statement,
      source: this.getId(),
      space,
      network,
      created: now,
      updated: now
    };
  }

  beforeFetchPage(page: number) {
    console.log(
      `[${this.getId()}] ${this.spaceId} - Fetching page #${page + 1}`
    );
  }

  async afterFetchPage(page: number, delegates: Delegate[]) {
    if (delegates.length) {
      this.delegates = { ...this.delegates, ...delegates };

      await this.importDelegates(delegates);
    }

    if (this.throttle_interval) {
      await snapshot.utils.sleep(this.throttle_interval);
    }
  }

  async importDelegates(delegates: Delegate[]) {
    console.log(
      `[${this.getId()}] -- Importing ${delegates.length} delegate(s)`
    );

    await hubDB.queryAsync(
      `INSERT IGNORE INTO statements (id, delegate, statement, source, space, network, created, updated) VALUES ?`,
      [delegates.map(d => Object.values(d))]
    );
  }

  throttled(): boolean {
    return this.throttle_interval > 0;
  }

  getId(): string {
    return '';
  }
}
