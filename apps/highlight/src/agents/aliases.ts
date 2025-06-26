import { ALIASES_CONFIG } from '@snapshot-labs/sx';
import Agent from '../highlight/agent';
import Process from '../highlight/process';
import { Domain } from '../highlight/types';

export default class Aliases extends Agent {
  constructor(id: string, process: Process) {
    super(id, process);

    this.addEntrypoint(ALIASES_CONFIG.types.setAlias);
  }

  async setAlias(
    message: { from: string; alias: string },
    meta: { domain: Domain; signer: string }
  ) {
    const { salt } = meta.domain;
    const { from, alias } = message;

    this.assert(from === meta.signer, 'Invalid signer');

    const aliasAlreadyExists = await this.has(`aliases:${alias}`);
    this.assert(aliasAlreadyExists === false, 'Alias already exists');

    this.write(`aliases:${alias}`, from);
    this.emit('setAlias', [from, alias, salt]);
  }
}
