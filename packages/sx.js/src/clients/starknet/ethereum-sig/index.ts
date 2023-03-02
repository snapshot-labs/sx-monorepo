import { hash } from 'starknet';
import randomBytes from 'randombytes';
import { snakeCase } from 'snake-case';
import { Web3Provider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import fetch from 'cross-fetch';
import { baseDomain, proposeTypes, voteTypes } from './types';
import { SplitUint256 } from '../../../utils/split-uint256';
import { hexPadRight, flatten2DArray } from '../../../utils/encoding';
import { bytesToHex } from '../../../utils/bytes';
import { getStrategies, getStrategiesParams } from '../../../utils/strategies';
import { defaultNetwork } from '../../../networks';
import type {
  Propose,
  Vote,
  EthSigProposeMessage,
  EthSigVoteMessage,
  Envelope,
  EthereumSigClientConfig,
  EthereumSigClientOpts
} from '../../../types';

export class EthereumSig {
  config: EthereumSigClientConfig;

  constructor(opts: EthereumSigClientOpts) {
    this.config = {
      networkConfig: defaultNetwork,
      ...opts
    };
  }

  generateSalt() {
    return Number(SplitUint256.fromHex(bytesToHex(randomBytes(4))).toHex());
  }

  public async sign<T extends EthSigProposeMessage | EthSigVoteMessage>(
    web3: Web3Provider | Wallet,
    address: string,
    message: T,
    types
  ): Promise<Envelope<T>> {
    const signer = Wallet.isSigner(web3) ? web3 : web3.getSigner();

    const domain = {
      ...baseDomain,
      chainId: this.config.networkConfig.eip712ChainId
    };

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
    const strategies = await getStrategies(data, this.config);
    const strategiesParams = await getStrategiesParams(
      'propose',
      strategies,
      address,
      data,
      this.config
    );

    const message: EthSigProposeMessage = {
      ...data,
      space: hexPadRight(data.space),
      authenticator: hexPadRight(data.authenticator),
      author: address,
      executor: hexPadRight(data.executor),
      executionHash: hexPadRight(hash.computeHashOnElements(data.executionParams)),
      strategiesHash: hexPadRight(
        hash.computeHashOnElements(data.strategies.map(strategy => `0x${strategy.toString(16)}`))
      ),
      strategiesParamsHash: hexPadRight(
        hash.computeHashOnElements(flatten2DArray(strategiesParams))
      ),
      salt: this.generateSalt()
    };

    return this.sign(web3, address, message, proposeTypes);
  }

  public async vote(web3: Web3Provider | Wallet, address: string, data: Vote) {
    const strategies = await getStrategies(data, this.config);
    const strategiesParams = await getStrategiesParams(
      'vote',
      strategies,
      address,
      data,
      this.config
    );

    const message: EthSigVoteMessage = {
      ...data,
      space: hexPadRight(data.space),
      authenticator: hexPadRight(data.authenticator),
      voter: address,
      strategiesHash: hexPadRight(
        hash.computeHashOnElements(data.strategies.map(strategy => `0x${strategy.toString(16)}`))
      ),
      strategiesParamsHash: hexPadRight(
        hash.computeHashOnElements(flatten2DArray(strategiesParams))
      ),
      salt: this.generateSalt()
    };

    return this.sign(web3, address, message, voteTypes);
  }
}
