"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EthereumTx = void 0;
const starknet_1 = require("starknet");
const micro_starknet_1 = require("micro-starknet");
const contracts_1 = require("@ethersproject/contracts");
const StarknetCommit_json_1 = __importDefault(require("./abis/StarknetCommit.json"));
const strategies_1 = require("../../../utils/strategies");
const starknet_enums_1 = require("../../../utils/starknet-enums");
const __1 = require("../../..");
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
const PROPOSE_SELECTOR = '0x1bfd596ae442867ef71ca523061610682af8b00fc2738329422f4ad8d220b81';
const VOTE_SELECTOR = '0x132bdf85fc8aa10ac3c22f02317f8f53d4b4f52235ed1eabb3a4cbbe08b5c41';
const UPDATE_PROPOSAL_SELECTOR = '0x1f93122f646d968b0ce8c1a4986533f8b4ed3f099122381a4f77478a480c2c3';
class EthereumTx {
    // TODO: handle sequencerUrl in network config
    config;
    constructor(opts) {
        this.config = {
            networkConfig: __1.defaultNetwork,
            sequencerUrl: opts.sequencerUrl || starknet_1.constants.BaseUrl.SN_GOERLI,
            ...opts
        };
    }
    async getMessageFee(l2Address, payload) {
        const sequencerProvider = new starknet_1.SequencerProvider({ baseUrl: this.config.sequencerUrl });
        const fees = await sequencerProvider.estimateMessageFee({
            from_address: this.config.networkConfig.starknetCommit,
            to_address: l2Address,
            entry_point_selector: 'commit',
            payload
        });
        return fees;
    }
    async estimateProposeFee(signer, data) {
        const address = await signer.getAddress();
        const hash = await this.getProposeHash(signer, data);
        return this.getMessageFee(data.authenticator, [address.toLocaleLowerCase(), hash]);
    }
    async estimateVoteFee(signer, data) {
        const address = await signer.getAddress();
        const hash = await this.getVoteHash(signer, data);
        return this.getMessageFee(data.authenticator, [address.toLocaleLowerCase(), hash]);
    }
    async estimateUpdateProposalFee(signer, data) {
        const address = await signer.getAddress();
        const hash = await this.getUpdateProposalHash(signer, data);
        return this.getMessageFee(data.authenticator, [address.toLocaleLowerCase(), hash]);
    }
    async getProposeHash(signer, data) {
        const address = await signer.getAddress();
        const userStrategies = await (0, strategies_1.getStrategiesWithParams)('propose', data.strategies, address, data, this.config);
        const callData = new starknet_1.CallData(ENCODE_ABI);
        const compiled = callData.compile('propose', [
            data.space,
            PROPOSE_SELECTOR,
            address,
            starknet_1.shortString.splitLongString(data.metadataUri),
            {
                address: data.executionStrategy.addr,
                params: data.executionStrategy.params
            },
            starknet_1.CallData.compile({
                userStrategies
            })
        ]);
        return `0x${(0, micro_starknet_1.poseidonHashMany)(compiled.map(v => BigInt(v))).toString(16)}`;
    }
    async getVoteHash(signer, data) {
        const address = await signer.getAddress();
        const userVotingStrategies = await (0, strategies_1.getStrategiesWithParams)('propose', data.strategies, address, data, this.config);
        const callData = new starknet_1.CallData(ENCODE_ABI);
        const compiled = callData.compile('vote', [
            data.space,
            VOTE_SELECTOR,
            address,
            data.proposal,
            (0, starknet_enums_1.getChoiceEnum)(data.choice),
            userVotingStrategies,
            starknet_1.shortString.splitLongString('') // metadataUri
        ]);
        return `0x${(0, micro_starknet_1.poseidonHashMany)(compiled.map(v => BigInt(v))).toString(16)}`;
    }
    async getUpdateProposalHash(signer, data) {
        const address = await signer.getAddress();
        const callData = new starknet_1.CallData(ENCODE_ABI);
        const compiled = callData.compile('update_proposal', [
            data.space,
            UPDATE_PROPOSAL_SELECTOR,
            address,
            data.proposal,
            {
                address: data.executionStrategy.addr,
                params: data.executionStrategy.params
            },
            starknet_1.shortString.splitLongString(data.metadataUri)
        ]);
        return `0x${(0, micro_starknet_1.poseidonHashMany)(compiled.map(v => BigInt(v))).toString(16)}`;
    }
    async initializePropose(signer, data, opts = {}) {
        const commitContract = new contracts_1.Contract(this.config.networkConfig.starknetCommit, StarknetCommit_json_1.default, signer);
        const hash = await this.getProposeHash(signer, data);
        const { overall_fee } = await this.estimateProposeFee(signer, data);
        const promise = commitContract.commit(data.authenticator, hash, { value: overall_fee });
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
    async initializeVote(signer, data, opts = {}) {
        const commitContract = new contracts_1.Contract(this.config.networkConfig.starknetCommit, StarknetCommit_json_1.default, signer);
        const hash = await this.getVoteHash(signer, data);
        const { overall_fee } = await this.estimateVoteFee(signer, data);
        const promise = commitContract.commit(data.authenticator, hash, { value: overall_fee });
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
    async initializeUpdateProposal(signer, data, opts = {}) {
        const commitContract = new contracts_1.Contract(this.config.networkConfig.starknetCommit, StarknetCommit_json_1.default, signer);
        const hash = await this.getUpdateProposalHash(signer, data);
        const { overall_fee } = await this.estimateUpdateProposalFee(signer, data);
        const promise = commitContract.commit(data.authenticator, hash, { value: overall_fee });
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
exports.EthereumTx = EthereumTx;
