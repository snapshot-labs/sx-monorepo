import { BaseProvider, BlockNotFoundError } from '@snapshot-labs/checkpoint';
import { Writer } from './types';
import Highlight from '../../highlight/highlight';
import { Event, Unit } from '../../highlight/types';

export let lastIndexedMci = 0;

export class HighlightProvider extends BaseProvider {
  private readonly writers: Record<string, Writer>;
  private highlight: Highlight;

  constructor({
    instance,
    log,
    abis,
    writers,
    highlight
  }: ConstructorParameters<typeof BaseProvider>[0] & {
    writers: Record<string, Writer>;
    highlight: Highlight;
  }) {
    super({ instance, log, abis });

    this.writers = writers;
    this.highlight = highlight;
  }

  async getNetworkIdentifier() {
    return 'highlight';
  }

  async init() {
    return;
  }

  async getLatestBlockNumber() {
    return this.highlight.getMci();
  }

  formatAddresses(addresses: string[]): string[] {
    return addresses;
  }

  async processBlock(blockNumber: number) {
    let receipt: { unit: Unit; events: Event[] };
    try {
      receipt = await this.highlight.getUnitReceipt({
        id: blockNumber
      });
    } catch {
      throw new BlockNotFoundError();
    }

    try {
      await this.handleBlock(blockNumber, receipt.unit, receipt.events);
      await this.instance.setLastIndexedBlock(blockNumber);
    } catch (e) {
      console.log('error when handling block', e);
      throw e;
    }

    lastIndexedMci = blockNumber;

    return blockNumber + 1;
  }

  private async handleBlock(blockNumber: number, unit: Unit, events: Event[]) {
    this.log.info({ blockNumber }, 'handling block');

    for (const [eventIndex, event] of events.entries()) {
      await this.handleEvent(blockNumber, unit, eventIndex, event);
    }

    this.log.debug({ blockNumber }, 'handling block done');
  }

  private async handleEvent(
    blockNumber: number,
    unit: Unit,
    eventIndex: number,
    event: Event
  ) {
    this.log.debug({ eventIndex }, 'handling event');

    const helpers = this.instance.getWriterHelpers();

    for (const source of this.instance.config.sources || []) {
      for (const sourceEvent of source.events) {
        if (source.contract === event.agent && sourceEvent.name === event.key) {
          this.log.info(
            {
              contract: source.contract,
              event: sourceEvent.name,
              handlerFn: sourceEvent.fn
            },
            'found event'
          );

          const writer = this.writers[sourceEvent.fn];
          if (!writer) {
            throw new Error(
              `No writer found for event ${sourceEvent.name} on contract ${source.contract}`
            );
          }

          await writer({
            source,
            blockNumber,
            unit,
            payload: event,
            helpers
          });
        }
      }
    }

    this.log.debug({ eventIndex }, 'handling event done');
  }
}
