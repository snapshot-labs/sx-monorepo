import snapshot from '@snapshot-labs/snapshot.js';
import { Provider } from './Provider';

export default class Safe extends Provider {
  static readonly MAPPING = {
    's:safe.eth':
      'https://safe-claiming-app-data.safe.global/guardians/guardians.json'
  };

  static readonly ID = 'safe';

  async _fetch() {
    const results = await snapshot.utils.getJSON(Safe.MAPPING[this.spaceId]);

    const delegates = results.map((result: any) => {
      return this.formatDelegate({
        delegate: result.address,
        statement: `${result.reason}\n\n${result.contribution}`.trim()
      });
    });

    await this.afterFetchPage(0, delegates);
  }

  getId(): string {
    return Safe.ID;
  }
}
