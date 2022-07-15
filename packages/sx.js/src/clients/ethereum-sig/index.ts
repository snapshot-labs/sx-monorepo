import { Web3Provider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import fetch from 'cross-fetch';
import { domain, Propose, Vote, proposeTypes, voteTypes } from './types';

export class EthereumSig {
  public readonly address: string;

  constructor(address: string) {
    this.address = address;
  }

  public async sign(web3: Web3Provider | Wallet, address: string, message, types) {
    // @ts-ignore
    const signer = web3?.getSigner ? web3.getSigner() : web3;
    const data: any = { domain, types, message };
    const sig = await signer._signTypedData(domain, data.types, message);
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

  public async propose(web3: Web3Provider | Wallet, address: string, message: Propose) {
    return await this.sign(web3, address, message, proposeTypes);
  }

  public async vote(web3: Web3Provider | Wallet, address: string, message: Vote) {
    return await this.sign(web3, address, message, voteTypes);
  }
}
