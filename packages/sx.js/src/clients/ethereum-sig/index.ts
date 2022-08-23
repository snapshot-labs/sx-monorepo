import { hash } from 'starknet';
import randomBytes from 'randombytes';
import { Web3Provider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import fetch from 'cross-fetch';
import { domain, proposeTypes, voteTypes } from './types';
import * as utils from '../../utils';
import { Propose, Vote, EthSigProposeMessage, EthSigVoteMessage, Envelope } from '../../types';

export class EthereumSig {
  public readonly address: string;

  constructor(address: string) {
    this.address = address;
  }

  generateSalt() {
    return Number(
      utils.splitUint256.SplitUint256.fromHex(utils.bytes.bytesToHex(randomBytes(4))).toHex()
    );
  }

  public async sign<T extends EthSigProposeMessage | EthSigVoteMessage>(
    web3: Web3Provider | Wallet,
    address: string,
    message: T,
    types
  ): Promise<Envelope<T>> {
    const signer = Wallet.isSigner(web3) ? web3 : web3.getSigner();
    const data = { domain, types, message };
    const sig = await signer._signTypedData(domain, data.types, message);
    return { address, sig, data } as any;
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

  public async propose(web3: Web3Provider | Wallet, address: string, data: Propose) {
    const message = {
      ...data,
      executionHash: utils.encoding.hexPadRight(hash.computeHashOnElements(data.executionParams)),
      salt: this.generateSalt()
    };

    return this.sign(web3, address, message, proposeTypes);
  }

  public async vote(web3: Web3Provider | Wallet, address: string, data: Vote) {
    const message = {
      ...data,
      salt: this.generateSalt()
    };

    return this.sign(web3, address, message, voteTypes);
  }
}
