import { hash } from 'starknet';
import randomBytes from 'randombytes';
import { snakeCase } from 'snake-case';
import { Web3Provider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import fetch from 'cross-fetch';
import { domain, proposeTypes, voteTypes } from './types';
import * as utils from '../../utils';
import { defaultNetwork } from '../../networks';
import type {
  Propose,
  Vote,
  EthSigProposeMessage,
  EthSigVoteMessage,
  Envelope,
  EthereumSigClientConfig,
  EthereumSigClientOpts
} from '../../types';

export class EthereumSig {
  config: EthereumSigClientConfig;

  constructor(opts: EthereumSigClientOpts) {
    this.config = {
      networkConfig: defaultNetwork,
      ...opts
    };
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

    const typedData = Object.fromEntries(
      Object.entries(message).map(([k, v]) => [snakeCase(k), v])
    );

    const sig = await signer._signTypedData(domain, data.types, typedData);
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
    const res = await fetch(this.config.manaUrl, init);
    const json = await res.json();
    return json.result;
  }

  public async propose(web3: Web3Provider | Wallet, address: string, data: Propose) {
    const strategies = await utils.strategies.getStrategies(data, this.config);
    const strategiesParams = await utils.strategies.getStrategiesParams(
      'propose',
      strategies,
      address,
      data,
      this.config
    );

    const message: EthSigProposeMessage = {
      ...data,
      space: utils.encoding.hexPadRight(data.space),
      authenticator: utils.encoding.hexPadRight(data.authenticator),
      author: address,
      executor: utils.encoding.hexPadRight(data.executor),
      executionHash: utils.encoding.hexPadRight(hash.computeHashOnElements(data.executionParams)),
      strategiesHash: utils.encoding.hexPadRight(
        hash.computeHashOnElements(data.strategies.map(strategy => `0x${strategy.toString(16)}`))
      ),
      strategiesParamsHash: utils.encoding.hexPadRight(
        hash.computeHashOnElements(utils.encoding.flatten2DArray(strategiesParams))
      ),
      salt: this.generateSalt()
    };

    return this.sign(web3, address, message, proposeTypes);
  }

  public async vote(web3: Web3Provider | Wallet, address: string, data: Vote) {
    const strategies = await utils.strategies.getStrategies(data, this.config);
    const strategiesParams = await utils.strategies.getStrategiesParams(
      'vote',
      strategies,
      address,
      data,
      this.config
    );

    const message: EthSigVoteMessage = {
      ...data,
      space: utils.encoding.hexPadRight(data.space),
      authenticator: utils.encoding.hexPadRight(data.authenticator),
      voter: address,
      strategiesHash: utils.encoding.hexPadRight(
        hash.computeHashOnElements(data.strategies.map(strategy => `0x${strategy.toString(16)}`))
      ),
      strategiesParamsHash: utils.encoding.hexPadRight(
        hash.computeHashOnElements(utils.encoding.flatten2DArray(strategiesParams))
      ),
      salt: this.generateSalt()
    };

    return this.sign(web3, address, message, voteTypes);
  }
}
