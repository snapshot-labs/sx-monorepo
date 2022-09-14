import { hash, defaultProvider } from 'starknet';
import randomBytes from 'randombytes';
import { Web3Provider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import fetch from 'cross-fetch';
import { getStrategy } from '../../strategies';
import { domain, proposeTypes, voteTypes } from './types';
import * as utils from '../../utils';
import {
  Propose,
  Vote,
  EthSigProposeMessage,
  EthSigVoteMessage,
  Envelope,
  EthereumSigClientConfig
} from '../../types';

export class EthereumSig {
  config: EthereumSigClientConfig;

  constructor(config: EthereumSigClientConfig) {
    this.config = config;
  }

  generateSalt() {
    return Number(
      utils.splitUint256.SplitUint256.fromHex(utils.bytes.bytesToHex(randomBytes(4))).toHex()
    );
  }

  async getStrategiesAddresses(data: Propose | Vote) {
    return Promise.all(
      data.strategies.map(
        (id) =>
          defaultProvider.getStorageAt(
            data.space,
            utils.encoding.getStorageVarAddress('Voting_voting_strategies_store', id.toString(16))
          ) as Promise<string>
      )
    );
  }

  async getStrategiesParams(call: 'propose' | 'vote', address: string, data: Propose | Vote) {
    const strategiesAddresses = await this.getStrategiesAddresses(data);

    return Promise.all(
      strategiesAddresses.map((strategyAddress, index) => {
        const strategy = getStrategy(strategyAddress);
        if (!strategy) throw new Error('Invalid strategy');

        return strategy.getParams(
          call,
          strategyAddress,
          index,
          {
            address,
            sig: '',
            data: {
              message: data
            }
          },
          this.config
        );
      })
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
    const res = await fetch(this.config.manaUrl, init);
    const json = await res.json();
    return json.result;
  }

  public async propose(web3: Web3Provider | Wallet, address: string, data: Propose) {
    const strategiesParams = await this.getStrategiesParams('propose', address, data);

    const message: EthSigProposeMessage = {
      ...data,
      space: utils.encoding.hexPadRight(data.space),
      authenticator: utils.encoding.hexPadRight(data.authenticator),
      proposerAddress: utils.encoding.hexPadRight(address),
      executor: utils.encoding.hexPadRight(data.executor),
      executionParamsHash: utils.encoding.hexPadRight(
        hash.computeHashOnElements(data.executionParams)
      ),
      usedVotingStrategiesHash: utils.encoding.hexPadRight(
        hash.computeHashOnElements(data.strategies.map((strategy) => `0x${strategy.toString(16)}`))
      ),
      userVotingStrategyParamsFlatHash: utils.encoding.hexPadRight(
        hash.computeHashOnElements(utils.encoding.flatten2DArray(strategiesParams))
      ),
      salt: this.generateSalt()
    };

    return this.sign(web3, address, message, proposeTypes);
  }

  public async vote(web3: Web3Provider | Wallet, address: string, data: Vote) {
    const strategiesParams = await this.getStrategiesParams('vote', address, data);

    const message: EthSigVoteMessage = {
      ...data,
      space: utils.encoding.hexPadRight(data.space),
      authenticator: utils.encoding.hexPadRight(data.authenticator),
      voterAddress: utils.encoding.hexPadRight(address),
      usedVotingStrategiesHash: utils.encoding.hexPadRight(
        hash.computeHashOnElements(data.strategies.map((strategy) => `0x${strategy.toString(16)}`))
      ),
      userVotingStrategyParamsFlatHash: utils.encoding.hexPadRight(
        hash.computeHashOnElements(utils.encoding.flatten2DArray(strategiesParams))
      ),
      salt: this.generateSalt()
    };

    return this.sign(web3, address, message, voteTypes);
  }
}
