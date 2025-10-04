import { Signer } from '@ethersproject/abstract-signer';
import { Contract } from '@ethersproject/contracts';
import { poseidonHashMany } from 'micro-starknet';
import { CallData, shortString } from 'starknet';
import StarknetCommitAbi from './abis/StarknetCommit.json';
import { getChoiceEnum } from '../../../utils/starknet-enums';
import { getStrategiesWithParams } from '../../../utils/strategies';
import {
  ClientConfig,
  ClientOpts,
  Envelope,
  Propose,
  UpdateProposal,
  Vote
} from '../types';

type CallOptions = {
  noWait?: boolean;
};

const ENCODE_ABI = [
  {
    type: 'struct',
    name: 'core::starknet::eth_address::EthAddress',
    members: [
      {
        name: 'address',
        type: 'core::felt252'
      }
    ]
  },
  {
    name: 'sx::utils::types::Strategy',
    type: 'struct',
    members: [
      {
        name: 'address',
        type: 'core::starknet::contract_address::ContractAddress'
      },
      {
        name: 'params',
        type: 'core::array::Array::<core::felt252>'
      }
    ]
  },
  {
    name: 'core::integer::u256',
    type: 'struct',
    members: [
      {
        name: 'low',
        type: 'core::integer::u128'
      },
      {
        name: 'high',
        type: 'core::integer::u128'
      }
    ]
  },
  {
    name: 'sx::utils::types::Choice',
    type: 'enum',
    variants: [
      {
        name: 'Against',
        type: '()'
      },
      {
        name: 'For',
        type: '()'
      },
      {
        name: 'Abstain',
        type: '()'
      }
    ]
  },
  {
    name: 'sx::utils::types::IndexedStrategy',
    type: 'struct',
    members: [
      {
        name: 'index',
        type: 'core::integer::u8'
      },
      {
        name: 'params',
        type: 'core::array::Array::<core::felt252>'
      }
    ]
  },
  {
    name: 'propose',
    type: 'function',
    inputs: [
      {
        name: 'target',
        type: 'core::starknet::contract_address::ContractAddress'
      },
      {
        name: 'selector',
        type: 'core::felt252'
      },
      {
        name: 'author',
        type: 'core::starknet::eth_address::EthAddress'
      },
      {
        name: 'metadata_Uri',
        type: 'core::array::Array::<core::felt252>'
      },
      {
        name: 'execution_strategy',
        type: 'sx::utils::types::Strategy'
      },
      {
        name: 'user_proposal_validation_params',
        type: 'core::array::Array::<core::felt252>'
      }
    ],
    outputs: [],
    state_mutability: 'external'
  },
  {
    name: 'vote',
    type: 'function',
    inputs: [
      {
        name: 'target',
        type: 'core::starknet::contract_address::ContractAddress'
      },
      {
        name: 'selector',
        type: 'core::felt252'
      },
      {
        name: 'voter',
        type: 'core::starknet::eth_address::EthAddress'
      },
      {
        name: 'proposal_id',
        type: 'core::integer::u256'
      },
      {
        name: 'choice',
        type: 'sx::utils::types::Choice'
      },
      {
        name: 'user_voting_strategies',
        type: 'core::array::Array::<sx::utils::types::IndexedStrategy>'
      },
      {
        name: 'metadata_Uri',
        type: 'core::array::Array::<core::felt252>'
      }
    ],
    outputs: [],
    state_mutability: 'external'
  },
  {
    name: 'update_proposal',
    type: 'function',
    inputs: [
      {
        name: 'target',
        type: 'core::starknet::contract_address::ContractAddress'
      },
      {
        name: 'selector',
        type: 'core::felt252'
      },
      {
        name: 'author',
        type: 'core::starknet::eth_address::EthAddress'
      },
      {
        name: 'proposal_id',
        type: 'core::integer::u256'
      },
      {
        name: 'execution_strategy',
        type: 'sx::utils::types::Strategy'
      },
      {
        name: 'metadata_Uri',
        type: 'core::array::Array::<core::felt252>'
      }
    ],
    outputs: [],
    state_mutability: 'external'
  }
];

const PROPOSE_SELECTOR =
  '0x1bfd596ae442867ef71ca523061610682af8b00fc2738329422f4ad8d220b81';
const VOTE_SELECTOR =
  '0x132bdf85fc8aa10ac3c22f02317f8f53d4b4f52235ed1eabb3a4cbbe08b5c41';
const UPDATE_PROPOSAL_SELECTOR =
  '0x1f93122f646d968b0ce8c1a4986533f8b4ed3f099122381a4f77478a480c2c3';

export class EthereumTx {
  config: ClientConfig;

  constructor(opts: ClientOpts) {
    this.config = {
      ...opts
    };
  }

  async getMessageFee(
    l2Address: string,
    payload: string[]
  ): Promise<{ overall_fee: number }> {
    const fees = await this.config.starkProvider.estimateMessageFee({
      from_address: this.config.networkConfig.starknetCommit,
      to_address: l2Address,
      entry_point_selector: 'commit',
      payload
    });

    return fees as any;
  }

  async estimateProposeFee(address: string, data: Propose) {
    const hash = await this.getProposeHash(address, data);

    return this.getMessageFee(data.authenticator, [
      address.toLocaleLowerCase(),
      hash
    ]);
  }

  async estimateVoteFee(address: string, data: Vote) {
    const hash = await this.getVoteHash(address, data);

    return this.getMessageFee(data.authenticator, [
      address.toLocaleLowerCase(),
      hash
    ]);
  }

  async estimateUpdateProposalFee(address: string, data: UpdateProposal) {
    const hash = await this.getUpdateProposalHash(address, data);

    return this.getMessageFee(data.authenticator, [
      address.toLocaleLowerCase(),
      hash
    ]);
  }

  async getProposeHash(address: string, data: Propose) {
    const userStrategies = await getStrategiesWithParams(
      'propose',
      data.strategies,
      address,
      data,
      this.config
    );

    const callData = new CallData(ENCODE_ABI);
    const compiled = callData.compile('propose', [
      data.space,
      PROPOSE_SELECTOR,
      address,
      shortString.splitLongString(data.metadataUri),
      {
        address: data.executionStrategy.addr,
        params: data.executionStrategy.params
      },
      CallData.compile({
        userStrategies
      })
    ]);

    return `0x${poseidonHashMany(compiled.map(v => BigInt(v))).toString(16)}`;
  }

  async getVoteHash(address: string, data: Vote) {
    const userVotingStrategies = await getStrategiesWithParams(
      'vote',
      data.strategies,
      address,
      data,
      this.config
    );

    const callData = new CallData(ENCODE_ABI);
    const compiled = callData.compile('vote', [
      data.space,
      VOTE_SELECTOR,
      address,
      data.proposal,
      getChoiceEnum(data.choice),
      userVotingStrategies,
      shortString.splitLongString(data.metadataUri)
    ]);

    return `0x${poseidonHashMany(compiled.map(v => BigInt(v))).toString(16)}`;
  }

  async getUpdateProposalHash(address: string, data: UpdateProposal) {
    const callData = new CallData(ENCODE_ABI);
    const compiled = callData.compile('update_proposal', [
      data.space,
      UPDATE_PROPOSAL_SELECTOR,
      address,
      data.proposal,
      {
        address: data.executionStrategy.addr,
        params: data.executionStrategy.params
      },
      shortString.splitLongString(data.metadataUri)
    ]);

    return `0x${poseidonHashMany(compiled.map(v => BigInt(v))).toString(16)}`;
  }

  async initializePropose(
    signer: Signer,
    data: Propose,
    opts: CallOptions = {}
  ): Promise<Envelope<Propose>> {
    const commitContract = new Contract(
      this.config.networkConfig.starknetCommit,
      StarknetCommitAbi,
      signer
    );

    const address = await signer.getAddress();
    const hash = await this.getProposeHash(address, data);
    const { overall_fee } = await this.estimateProposeFee(address, data);

    const promise = commitContract.commit(data.authenticator, hash, {
      value: overall_fee,
      gasLimit: opts.noWait ? 0 : undefined
    });
    const res = opts.noWait ? null : await promise;

    return {
      signatureData: {
        address: await signer.getAddress(),
        commitTxId: res?.hash ?? null,
        commitHash: hash,
        primaryType: 'Propose'
      },
      data
    };
  }

  async initializeVote(
    signer: Signer,
    data: Vote,
    opts: CallOptions = {}
  ): Promise<Envelope<Vote>> {
    const commitContract = new Contract(
      this.config.networkConfig.starknetCommit,
      StarknetCommitAbi,
      signer
    );

    const address = await signer.getAddress();
    const hash = await this.getVoteHash(address, data);
    const { overall_fee } = await this.estimateVoteFee(address, data);

    const promise = commitContract.commit(data.authenticator, hash, {
      value: overall_fee,
      gasLimit: opts.noWait ? 0 : undefined
    });
    const res = opts.noWait ? null : await promise;

    return {
      signatureData: {
        address: await signer.getAddress(),
        commitTxId: res?.hash ?? null,
        commitHash: hash,
        primaryType: 'Vote'
      },
      data
    };
  }

  async initializeUpdateProposal(
    signer: Signer,
    data: UpdateProposal,
    opts: CallOptions = {}
  ): Promise<Envelope<UpdateProposal>> {
    const commitContract = new Contract(
      this.config.networkConfig.starknetCommit,
      StarknetCommitAbi,
      signer
    );

    const address = await signer.getAddress();
    const hash = await this.getUpdateProposalHash(address, data);
    const { overall_fee } = await this.estimateUpdateProposalFee(address, data);

    const promise = commitContract.commit(data.authenticator, hash, {
      value: overall_fee,
      gasLimit: opts.noWait ? 0 : undefined
    });
    const res = opts.noWait ? null : await promise;

    return {
      signatureData: {
        address: await signer.getAddress(),
        commitTxId: res?.hash ?? null,
        commitHash: hash,
        primaryType: 'UpdateProposal'
      },
      data
    };
  }
}
