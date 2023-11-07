"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProposalTypes = exports.voteTypes = exports.proposeTypes = exports.sharedTypes = exports.domainTypes = exports.baseDomain = void 0;
exports.baseDomain = {
    name: 'sx-sn',
    version: '0.1.0'
};
exports.domainTypes = {
    StarkNetDomain: [
        { name: 'name', type: 'felt252' },
        { name: 'version', type: 'felt252' },
        { name: 'chainId', type: 'felt252' },
        { name: 'verifyingContract', type: 'ContractAddress' }
    ]
};
exports.sharedTypes = {
    Strategy: [
        { name: 'address', type: 'felt252' },
        { name: 'params', type: 'felt*' }
    ],
    IndexedStrategy: [
        { name: 'index', type: 'felt252' },
        { name: 'params', type: 'felt*' }
    ],
    u256: [
        { name: 'low', type: 'felt252' },
        { name: 'high', type: 'felt252' }
    ]
};
exports.proposeTypes = {
    StarkNetDomain: exports.domainTypes.StarkNetDomain,
    Propose: [
        { name: 'space', type: 'ContractAddress' },
        { name: 'author', type: 'ContractAddress' },
        { name: 'metadataUri', type: 'felt*' },
        { name: 'executionStrategy', type: 'Strategy' },
        { name: 'userProposalValidationParams', type: 'felt*' },
        { name: 'salt', type: 'felt252' }
    ],
    Strategy: exports.sharedTypes.Strategy
};
exports.voteTypes = {
    StarkNetDomain: exports.domainTypes.StarkNetDomain,
    Vote: [
        { name: 'space', type: 'ContractAddress' },
        { name: 'voter', type: 'ContractAddress' },
        { name: 'proposalId', type: 'u256' },
        { name: 'choice', type: 'felt252' },
        { name: 'userVotingStrategies', type: 'IndexedStrategy*' },
        { name: 'metadataUri', type: 'felt*' }
    ],
    IndexedStrategy: exports.sharedTypes.IndexedStrategy,
    u256: exports.sharedTypes.u256
};
exports.updateProposalTypes = {
    StarkNetDomain: exports.domainTypes.StarkNetDomain,
    UpdateProposal: [
        { name: 'space', type: 'ContractAddress' },
        { name: 'author', type: 'ContractAddress' },
        { name: 'proposalId', type: 'u256' },
        { name: 'executionStrategy', type: 'Strategy' },
        { name: 'metadataUri', type: 'felt*' },
        { name: 'salt', type: 'felt252' }
    ],
    Strategy: exports.sharedTypes.Strategy,
    u256: exports.sharedTypes.u256
};
