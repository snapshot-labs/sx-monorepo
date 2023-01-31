import { AccountInterface } from 'starknet';
import fetch from 'cross-fetch';
import { domain, Propose, Vote, proposeTypes, voteTypes } from './types';

export class StarkNetSig {
  public readonly address: string;

  constructor(address: string) {
    this.address = address;
  }

  public async sign(signer: AccountInterface, address: string, message, types, primaryType) {
    const data: any = { domain, types, primaryType, message };
    const sig = await signer.signMessage(data);
    return { address, sig, data };
  }

  public async send(envelop) {
    const init = {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'send',
        params: { envelop },
        id: null
      })
    };
    const res = await fetch(this.address, init);
    const json = await res.json();
    return json.result;
  }

  public async propose(web3: AccountInterface, address: string, message: Propose) {
    return await this.sign(web3, address, message, proposeTypes, 'Propose');
  }

  public async vote(web3: AccountInterface, address: string, message: Vote) {
    return await this.sign(web3, address, message, voteTypes, 'Vote');
  }
}
