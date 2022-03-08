import { Web3Provider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import fetch from 'cross-fetch';
import {
  domain,
  IProposal,
  IVote,
  proposalTypes,
  voteTypes
} from './types';

export class Client {
  public readonly address: string;

  constructor(address: string) {
    this.address = address;
  }

  public async sign(web3: Web3Provider | Wallet, address: string, message, types) {
    // @ts-ignore
    const signer = web3?.getSigner ? web3.getSigner() : web3;
    const data: any = { domain, types, message };
    try {
      const sig = await signer._signTypedData(domain, data.types, message);
      return { address, sig, data };
    } catch (e) {
      return Promise.reject(e);
    }
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

  public async proposal(
    web3: Web3Provider | Wallet,
    address: string,
    message: IProposal
  ) {
    return await this.sign(web3, address, message, proposalTypes);
  }

  public async vote(web3: Web3Provider | Wallet, address: string, message: IVote) {
    return await this.sign(web3, address, message, voteTypes);
  }
}
