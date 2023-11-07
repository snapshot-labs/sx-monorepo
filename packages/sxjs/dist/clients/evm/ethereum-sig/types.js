"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.voteTypes = exports.updateProposalTypes = exports.proposeTypes = exports.domain = void 0;
exports.domain = {
    name: 'snapshot-x',
    version: '1.0.0'
};
exports.proposeTypes = {
    Propose: [
        { name: 'space', type: 'address' },
        { name: 'author', type: 'address' },
        { name: 'metadataURI', type: 'string' },
        { name: 'executionStrategy', type: 'Strategy' },
        { name: 'userProposalValidationParams', type: 'bytes' },
        { name: 'salt', type: 'uint256' }
    ],
    Strategy: [
        { name: 'addr', type: 'address' },
        { name: 'params', type: 'bytes' }
    ]
};
exports.updateProposalTypes = {
    updateProposal: [
        { name: 'space', type: 'address' },
        { name: 'author', type: 'address' },
        { name: 'proposalId', type: 'uint256' },
        { name: 'executionStrategy', type: 'Strategy' },
        { name: 'metadataURI', type: 'string' },
        { name: 'salt', type: 'uint256' }
    ],
    Strategy: [
        { name: 'addr', type: 'address' },
        { name: 'params', type: 'bytes' }
    ]
};
exports.voteTypes = {
    Vote: [
        { name: 'space', type: 'address' },
        { name: 'voter', type: 'address' },
        { name: 'proposalId', type: 'uint256' },
        { name: 'choice', type: 'uint8' },
        { name: 'userVotingStrategies', type: 'IndexedStrategy[]' },
        { name: 'voteMetadataURI', type: 'string' }
    ],
    IndexedStrategy: [
        { name: 'index', type: 'uint8' },
        { name: 'params', type: 'bytes' }
    ]
};
