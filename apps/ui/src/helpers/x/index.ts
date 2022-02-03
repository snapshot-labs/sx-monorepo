import fetch from 'cross-fetch';
import { Web3Provider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import {
  domain,
  Proposal,
  proposalTypes,
  Vote,
  voteTypes
} from '@/helpers/x/types';

export default class Client {
  readonly address: string;

  constructor(address) {
    this.address = address;
  }

  async sign(web3: Web3Provider | Wallet, address: string, message, types) {
    // @ts-ignore
    const signer = web3?.getSigner ? web3.getSigner() : web3;
    const data: any = { domain, types, message };
    try {
      const sig = await signer._signTypedData(domain, data.types, message);
      return { address, sig, data };
    } catch (e) {
      console.log(e);
    }
  }

  async send(envelop) {
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

  async proposal(
    web3: Web3Provider | Wallet,
    address: string,
    message: Proposal
  ) {
    return await this.sign(web3, address, message, proposalTypes);
  }

  async vote(web3: Web3Provider | Wallet, address: string, message: Vote) {
    return await this.sign(web3, address, message, voteTypes);
  }
}
