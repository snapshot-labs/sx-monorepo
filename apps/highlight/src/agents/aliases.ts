import { ALIASES_CONFIG } from '@snapshot-labs/sx';
import Agent from '../highlight/agent';
import Process from '../highlight/process';
import { Domain } from '../highlight/types';

type Message = { from: string; alias: string };
type Meta = { domain: Domain; signer: string };

export default class Aliases extends Agent {
  constructor(id: string, process: Process) {
    super(id, process);

    this.addEntrypoint(ALIASES_CONFIG.types.setAlias);

    // Stripping StarknetDomain from the types,
    // for compatibility with the Agent system only supporting EVM types.
    this.addEntrypoint({
      SetStarknetAlias: ALIASES_CONFIG.types.setStarknetAlias.SetStarknetAlias
    });
  }

  async setAlias(message: Message, meta: Meta) {
    const { salt } = meta.domain;
    const { from, alias } = message;

    this.assert(from === meta.signer, 'Invalid signer');

    const aliasAlreadyExists = await this.has(`aliases:${alias}`);
    this.assert(aliasAlreadyExists === false, 'Alias already exists');

    this.write(`aliases:${alias}`, from);
    this.emit('setAlias', [from, alias, salt]);
  }

  async setStarknetAlias(message: Message, meta: Meta) {
    await this.setAlias(message, meta);
  }
}
