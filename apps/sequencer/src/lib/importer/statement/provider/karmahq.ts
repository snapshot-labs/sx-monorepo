import fetch, { Response } from 'node-fetch';
import TurndownService from 'turndown';
import { Provider } from './Provider';
import { Delegate } from '../';

const turndownService = new TurndownService();

export default class Karmahq extends Provider {
  static readonly MAPPING = {
    's:aave.eth': 'aave',
    's:apecoin.eth': 'apecoin',
    's:arbitrumfoundation.eth': 'arbitrum',
    's:gitcoindao.eth': 'gitcoin',
    's:moonbeam-foundation.eth': 'moonbeam',
    's:opcollective.eth': 'optimism',
    's:rocketpool-dao.eth': 'rocketpool',
    'sn:0x009fedaf0d7a480d21a27683b0965c0f8ded35b3f1cac39827a25a06a8a682a4':
      'starknet'
  };

  static readonly ID = 'karmahq';

  async fetchWithRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
    try {
      const response: Response = await fn();

      if (!response.ok) {
        throw new Error(`Response not ok: ${response.status}`);
      }

      return response;
    } catch (err) {
      if (retries <= 0) {
        throw err;
      }

      console.log(`Error, retrying...`);
      return this.fetchWithRetry(fn, retries - 1);
    }
  }

  async _fetch() {
    const PAGE_SIZE = 1000;
    let page = 0;

    while (true) {
      this.beforeFetchPage(page);

      const response: Response = await this.fetchWithRetry(() => {
        return fetch(
          `https://api.karmahq.xyz/api/dao/delegates?name=${
            Karmahq.MAPPING[this.spaceId]
          }&offset=${page}&pageSize=${PAGE_SIZE}`
        );
      });

      const body = await response.json();

      if (!body.data.delegates.length) break;

      const _delegates: Delegate[] = [];
      body.data.delegates.forEach(delegate => {
        const statement = delegate.delegatePitch?.customFields?.find(
          field => field.label === 'statement'
        )?.value;

        if (
          !statement ||
          typeof statement !== 'string' ||
          delegate.publicAddress ===
            '0x0000000000000000000000000000000000000000'
        ) {
          return;
        }

        _delegates.push(
          this.formatDelegate({
            delegate: delegate.publicAddress,
            statement: (statement.startsWith('<')
              ? turndownService.turndown(statement)
              : statement
            ).trim()
          })
        );
      });

      await this.afterFetchPage(page, _delegates);

      page++;
    }
  }

  getId(): string {
    return Karmahq.ID;
  }
}
