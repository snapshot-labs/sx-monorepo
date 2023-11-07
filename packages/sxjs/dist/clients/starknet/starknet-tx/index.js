"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StarkNetTx = void 0;
const starknet_1 = require("starknet");
const micro_starknet_1 = require("micro-starknet");
const randombytes_1 = __importDefault(require("randombytes"));
const strategies_1 = require("../../../utils/strategies");
const starknet_2 = require("../../../authenticators/starknet");
const encoding_1 = require("../../../utils/encoding");
const networks_1 = require("../../../networks");
const Space_json_1 = __importDefault(require("./abis/Space.json"));
const NO_UPDATE_U32 = '0xf2cda9b1';
const NO_UPDATE_ADDRESS = '0xf2cda9b13ed04e585461605c0d6e804933ca828111bd94d4e6a96c75e8b048';
const NO_UPDATE_STRING = 'No update';
const callData = new starknet_1.CallData(Space_json_1.default);
class StarkNetTx {
    config;
    constructor(opts) {
        this.config = {
            networkConfig: networks_1.defaultNetwork,
            ...opts
        };
    }
    async deploySpace({ account, params: { controller, votingDelay, minVotingDuration, maxVotingDuration, metadataUri, daoUri, proposalValidationStrategy, proposalValidationStrategyMetadataUri, authenticators, votingStrategies, votingStrategiesMetadata }, saltNonce }) {
        saltNonce = saltNonce || `0x${(0, randombytes_1.default)(30).toString('hex')}`;
        const address = await this.predictSpaceAddress({ account, saltNonce });
        const res = await account.execute({
            contractAddress: this.config.networkConfig.spaceFactory,
            entrypoint: 'deploy',
            calldata: starknet_1.CallData.compile({
                class_hash: this.config.networkConfig.masterSpace,
                initialize_calldata: callData.compile('initialize', [
                    controller,
                    minVotingDuration,
                    maxVotingDuration,
                    votingDelay,
                    {
                        address: proposalValidationStrategy.addr,
                        params: proposalValidationStrategy.params
                    },
                    starknet_1.shortString.splitLongString(proposalValidationStrategyMetadataUri),
                    votingStrategies.map(strategy => ({
                        address: strategy.addr,
                        params: strategy.params
                    })),
                    votingStrategiesMetadata.map(metadata => starknet_1.shortString.splitLongString(metadata)),
                    authenticators,
                    starknet_1.shortString.splitLongString(metadataUri),
                    starknet_1.shortString.splitLongString(daoUri)
                ]),
                salt_nonce: saltNonce
            })
        });
        return { txId: res.transaction_hash, address };
    }
    async getSalt({ sender, saltNonce }) {
        return (0, micro_starknet_1.poseidonHashMany)([BigInt(sender), BigInt(saltNonce)]);
    }
    async predictSpaceAddress({ account, saltNonce }) {
        const salt = await this.getSalt({ sender: account.address, saltNonce });
        return (0, encoding_1.hexPadLeft)(starknet_1.hash.calculateContractAddressFromHash(salt, this.config.networkConfig.masterSpace, starknet_1.CallData.compile([]), this.config.networkConfig.spaceFactory));
    }
    async propose(account, envelope) {
        const authorAddress = envelope.signatureData?.address || account.address;
        const authenticator = (0, starknet_2.getAuthenticator)(envelope.data.authenticator, this.config.networkConfig);
        if (!authenticator) {
            throw new Error('Invalid authenticator');
        }
        const userStrategies = await (0, strategies_1.getStrategiesWithParams)('propose', envelope.data.strategies, authorAddress, envelope.data, this.config);
        const call = authenticator.createProposeCall(envelope, {
            author: authorAddress,
            executionStrategy: {
                address: envelope.data.executionStrategy.addr,
                params: envelope.data.executionStrategy.params
            },
            strategiesParams: starknet_1.CallData.compile({
                userStrategies
            }),
            metadataUri: envelope.data.metadataUri
        });
        const calls = [call];
        return account.execute(calls);
    }
    async updateProposal(account, envelope) {
        const authorAddress = envelope.signatureData?.address || account.address;
        const authenticator = (0, starknet_2.getAuthenticator)(envelope.data.authenticator, this.config.networkConfig);
        if (!authenticator) {
            throw new Error('Invalid authenticator');
        }
        const call = authenticator.createUpdateProposalCall(envelope, {
            author: authorAddress,
            proposalId: envelope.data.proposal,
            executionStrategy: {
                address: envelope.data.executionStrategy.addr,
                params: envelope.data.executionStrategy.params
            },
            metadataUri: envelope.data.metadataUri
        });
        const calls = [call];
        return account.execute(calls);
    }
    async vote(account, envelope) {
        const voterAddress = envelope.signatureData?.address || account.address;
        const authenticator = (0, starknet_2.getAuthenticator)(envelope.data.authenticator, this.config.networkConfig);
        if (!authenticator) {
            throw new Error('Invalid authenticator');
        }
        const votingStrategies = await (0, strategies_1.getStrategiesWithParams)('vote', envelope.data.strategies, voterAddress, envelope.data, this.config);
        const call = authenticator.createVoteCall(envelope, {
            voter: voterAddress,
            proposalId: envelope.data.proposal,
            choice: envelope.data.choice,
            votingStrategies,
            metadataUri: ''
        });
        return account.execute(call);
    }
    execute({ signer, space, proposalId, executionPayload }) {
        return signer.execute({
            contractAddress: space,
            entrypoint: 'execute',
            calldata: callData.compile('execute', [starknet_1.uint256.bnToUint256(proposalId), executionPayload])
        });
    }
    async updateSettings({ signer, space, settings }) {
        const settingsData = [
            {
                min_voting_duration: settings.minVotingDuration ?? NO_UPDATE_U32,
                max_voting_duration: settings.maxVotingDuration ?? NO_UPDATE_U32,
                voting_delay: settings.votingDelay ?? NO_UPDATE_U32,
                metadata_uri: starknet_1.shortString.splitLongString(settings.metadataUri ?? NO_UPDATE_STRING),
                dao_uri: starknet_1.shortString.splitLongString(settings.daoUri ?? NO_UPDATE_STRING),
                proposal_validation_strategy: settings.proposalValidationStrategy
                    ? {
                        address: settings.proposalValidationStrategy.addr,
                        params: settings.proposalValidationStrategy.params
                    }
                    : {
                        address: NO_UPDATE_ADDRESS,
                        params: []
                    },
                proposal_validation_strategy_metadata_uri: starknet_1.shortString.splitLongString(settings.proposalValidationStrategyMetadataUri ?? NO_UPDATE_STRING),
                authenticators_to_add: settings.authenticatorsToAdd ?? [],
                authenticators_to_remove: settings.authenticatorsToRemove ?? [],
                voting_strategies_to_add: settings.votingStrategiesToAdd?.map(config => ({
                    address: config.addr,
                    params: config.params
                })) ?? [],
                voting_strategies_to_remove: settings.votingStrategiesToRemove ?? [],
                voting_strategies_metadata_uris_to_add: (settings.votingStrategyMetadataUrisToAdd &&
                    settings.votingStrategyMetadataUrisToAdd.map(str => starknet_1.shortString.splitLongString(str))) ??
                    []
            }
        ];
        return signer.execute({
            contractAddress: space,
            entrypoint: 'update_settings',
            calldata: callData.compile('update_settings', settingsData)
        });
    }
    async cancelProposal({ signer, space, proposal }) {
        return signer.execute({
            contractAddress: space,
            entrypoint: 'cancel',
            calldata: callData.compile('cancel', [starknet_1.uint256.bnToUint256(proposal)])
        });
    }
    async setMinVotingDuration({ signer, space, minVotingDuration }) {
        return this.updateSettings({
            signer,
            space,
            settings: {
                minVotingDuration
            }
        });
    }
    async setMaxVotingDuration({ signer, space, maxVotingDuration }) {
        return this.updateSettings({
            signer,
            space,
            settings: {
                maxVotingDuration
            }
        });
    }
    async setVotingDelay({ signer, space, votingDelay }) {
        return this.updateSettings({
            signer,
            space,
            settings: {
                votingDelay
            }
        });
    }
    async setMetadataUri({ signer, space, metadataUri }) {
        return this.updateSettings({
            signer,
            space,
            settings: {
                metadataUri
            }
        });
    }
    async transferOwnership({ signer, space, owner }) {
        return signer.execute({
            contractAddress: space,
            entrypoint: 'transfer_ownership',
            calldata: callData.compile('transfer_ownership', [owner])
        });
    }
}
exports.StarkNetTx = StarkNetTx;
