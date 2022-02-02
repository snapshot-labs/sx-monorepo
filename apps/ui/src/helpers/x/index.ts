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
  // readonly address: string;

  constructor() {
    // this.address = address;
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
