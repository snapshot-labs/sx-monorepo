"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProposalTypes = exports.voteTypes = exports.proposeTypes = exports.sharedTypes = void 0;
exports.sharedTypes = {
    Strategy: [
        { name: 'address', type: 'uint256' },
        { name: 'params', type: 'uint256[]' }
    ],
    IndexedStrategy: [
        { name: 'index', type: 'uint256' },
        { name: 'params', type: 'uint256[]' }
    ]
};
exports.proposeTypes = {
    Propose: [
        { name: 'chainId', type: 'uint256' },
        { name: 'authenticator', type: 'uint256' },
        { name: 'space', type: 'uint256' },
        { name: 'author', type: 'address' },
        { name: 'metadataUri', type: 'uint256[]' },
        { name: 'executionStrategy', type: 'Strategy' },
        { name: 'userProposalValidationParams', type: 'uint256[]' },
        { name: 'salt', type: 'uint256' }
    ],
    Strategy: exports.sharedTypes.Strategy
};
exports.voteTypes = {
    Vote: [
        { name: 'chainId', type: 'uint256' },
        { name: 'authenticator', type: 'uint256' },
        { name: 'space', type: 'uint256' },
        { name: 'voter', type: 'address' },
        { name: 'proposalId', type: 'uint256' },
        { name: 'choice', type: 'uint256' },
        { name: 'userVotingStrategies', type: 'IndexedStrategy[]' },
        { name: 'metadataUri', type: 'uint256[]' }
    ],
    IndexedStrategy: exports.sharedTypes.IndexedStrategy
};
exports.updateProposalTypes = {
    UpdateProposal: [
        { name: 'chainId', type: 'uint256' },
        { name: 'authenticator', type: 'uint256' },
        { name: 'space', type: 'uint256' },
        { name: 'author', type: 'address' },
        { name: 'proposalId', type: 'uint256' },
        { name: 'executionStrategy', type: 'Strategy' },
        { name: 'metadataUri', type: 'uint256[]' },
        { name: 'salt', type: 'uint256' }
    ],
    Strategy: exports.sharedTypes.Strategy
};
