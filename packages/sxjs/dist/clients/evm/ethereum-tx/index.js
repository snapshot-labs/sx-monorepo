"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EthereumTx = void 0;
const contracts_1 = require("@ethersproject/contracts");
const abi_1 = require("@ethersproject/abi");
const solidity_1 = require("@ethersproject/solidity");
const randombytes_1 = __importDefault(require("randombytes"));
const evm_1 = require("../../../authenticators/evm");
const evm_2 = require("../../../strategies/evm");
const networks_1 = require("../../../networks");
const Space_json_1 = __importDefault(require("./abis/Space.json"));
const ProxyFactory_json_1 = __importDefault(require("./abis/ProxyFactory.json"));
const AvatarExecutionStrategy_json_1 = __importDefault(require("./abis/AvatarExecutionStrategy.json"));
const TimelockExecutionStrategy_json_1 = __importDefault(require("./abis/TimelockExecutionStrategy.json"));
const NO_UPDATE_STRING = 'No update';
const NO_UPDATE_ADDRESS = '0xf2cda9b13ed04e585461605c0d6e804933ca8281';
const NO_UPDATE_UINT32 = '0xf2cda9b1';
class EthereumTx {
    networkConfig;
    constructor(opts) {
        this.networkConfig = opts?.networkConfig || networks_1.evmGoerli;
    }
    async deployAvatarExecution({ signer, params: { controller, target, spaces, quorum }, saltNonce }) {
        saltNonce = saltNonce || `0x${(0, randombytes_1.default)(32).toString('hex')}`;
        const implementationAddress = this.networkConfig.executionStrategiesImplementations['SimpleQuorumAvatar'];
        if (!implementationAddress) {
            throw new Error('Missing SimpleQuorumAvatar implementation address');
        }
        const abiCoder = new abi_1.AbiCoder();
        const avatarExecutionStrategyInterface = new abi_1.Interface(AvatarExecutionStrategy_json_1.default);
        const proxyFactoryContract = new contracts_1.Contract(this.networkConfig.proxyFactory, ProxyFactory_json_1.default, signer);
        const initParams = abiCoder.encode(['address', 'address', 'address[]', 'uint256'], [controller, target, spaces, quorum]);
        const functionData = avatarExecutionStrategyInterface.encodeFunctionData('setUp', [initParams]);
        const sender = await signer.getAddress();
        const salt = await this.getSalt({
            sender,
            saltNonce
        });
        const address = await proxyFactoryContract.predictProxyAddress(implementationAddress, salt);
        const response = await proxyFactoryContract.deployProxy(implementationAddress, functionData, saltNonce);
        return { address, txId: response.hash };
    }
    async deployTimelockExecution({ signer, params: { controller, vetoGuardian, spaces, timelockDelay, quorum }, saltNonce }) {
        saltNonce = saltNonce || `0x${(0, randombytes_1.default)(32).toString('hex')}`;
        const implementationAddress = this.networkConfig.executionStrategiesImplementations['SimpleQuorumTimelock'];
        if (!implementationAddress) {
            throw new Error('Missing SimpleQuorumTimelock implementation address');
        }
        const abiCoder = new abi_1.AbiCoder();
        const timelockExecutionStrategyInterface = new abi_1.Interface(TimelockExecutionStrategy_json_1.default);
        const proxyFactoryContract = new contracts_1.Contract(this.networkConfig.proxyFactory, ProxyFactory_json_1.default, signer);
        const initParams = abiCoder.encode(['address', 'address', 'address[]', 'uint256', 'uint256'], [controller, vetoGuardian, spaces, timelockDelay, quorum]);
        const functionData = timelockExecutionStrategyInterface.encodeFunctionData('setUp', [
            initParams
        ]);
        const sender = await signer.getAddress();
        const salt = await this.getSalt({
            sender,
            saltNonce
        });
        const address = await proxyFactoryContract.predictProxyAddress(implementationAddress, salt);
        const response = await proxyFactoryContract.deployProxy(implementationAddress, functionData, saltNonce);
        return { address, txId: response.hash };
    }
    async deploySpace({ signer, params: { controller, votingDelay, minVotingDuration, maxVotingDuration, proposalValidationStrategy, proposalValidationStrategyMetadataUri, daoUri, metadataUri, authenticators, votingStrategies, votingStrategiesMetadata }, saltNonce }) {
        saltNonce = saltNonce || `0x${(0, randombytes_1.default)(32).toString('hex')}`;
        const spaceInterface = new abi_1.Interface(Space_json_1.default);
        const proxyFactoryContract = new contracts_1.Contract(this.networkConfig.proxyFactory, ProxyFactory_json_1.default, signer);
        const functionData = spaceInterface.encodeFunctionData('initialize', [
            [
                controller,
                votingDelay,
                minVotingDuration,
                maxVotingDuration,
                proposalValidationStrategy,
                proposalValidationStrategyMetadataUri,
                daoUri,
                metadataUri,
                votingStrategies,
                votingStrategiesMetadata,
                authenticators
            ]
        ]);
        const sender = await signer.getAddress();
        const salt = await this.getSalt({
            sender,
            saltNonce
        });
        const address = await proxyFactoryContract.predictProxyAddress(this.networkConfig.masterSpace, salt);
        const response = await proxyFactoryContract.deployProxy(this.networkConfig.masterSpace, functionData, saltNonce);
        return { address, txId: response.hash };
    }
    async getSalt({ sender, saltNonce }) {
        return (0, solidity_1.keccak256)(['address', 'uint256'], [sender, saltNonce]);
    }
    async predictSpaceAddress({ signer, saltNonce }) {
        const proxyFactoryContract = new contracts_1.Contract(this.networkConfig.proxyFactory, ProxyFactory_json_1.default, signer);
        const sender = await signer.getAddress();
        const salt = await this.getSalt({
            sender,
            saltNonce
        });
        return proxyFactoryContract.predictProxyAddress(this.networkConfig.masterSpace, salt);
    }
    async propose({ signer, envelope }, opts = {}) {
        const proposerAddress = envelope.signatureData?.address || (await signer.getAddress());
        const userStrategies = await (0, evm_2.getStrategiesWithParams)('propose', envelope.data.strategies, proposerAddress, envelope.data, this.networkConfig);
        const abiCoder = new abi_1.AbiCoder();
        const spaceInterface = new abi_1.Interface(Space_json_1.default);
        const functionData = spaceInterface.encodeFunctionData('propose', [
            proposerAddress,
            envelope.data.metadataUri,
            envelope.data.executionStrategy,
            abiCoder.encode(['tuple(int8 index, bytes params)[]'], [userStrategies])
        ]);
        const selector = functionData.slice(0, 10);
        const calldata = `0x${functionData.slice(10)}`;
        const authenticator = (0, evm_1.getAuthenticator)(envelope.data.authenticator, this.networkConfig);
        if (!authenticator) {
            throw new Error('Invalid authenticator');
        }
        const { abi, args } = authenticator.createCall(envelope, selector, [calldata]);
        const authenticatorContract = new contracts_1.Contract(envelope.data.authenticator, abi, signer);
        const promise = authenticatorContract.authenticate(...args);
        return opts.noWait ? null : promise;
    }
    async updateProposal({ signer, envelope }, opts = {}) {
        const authorAddress = envelope.signatureData?.address || (await signer.getAddress());
        const spaceInterface = new abi_1.Interface(Space_json_1.default);
        const functionData = spaceInterface.encodeFunctionData('updateProposal', [
            authorAddress,
            envelope.data.proposal,
            envelope.data.executionStrategy,
            envelope.data.metadataUri
        ]);
        const selector = functionData.slice(0, 10);
        const calldata = `0x${functionData.slice(10)}`;
        const authenticator = (0, evm_1.getAuthenticator)(envelope.data.authenticator, this.networkConfig);
        if (!authenticator) {
            throw new Error('Invalid authenticator');
        }
        const { abi, args } = authenticator.createCall(envelope, selector, [calldata]);
        const authenticatorContract = new contracts_1.Contract(envelope.data.authenticator, abi, signer);
        const promise = authenticatorContract.authenticate(...args);
        return opts.noWait ? null : promise;
    }
    async vote({ signer, envelope }, opts = {}) {
        const voterAddress = envelope.signatureData?.address || (await signer.getAddress());
        const userVotingStrategies = await (0, evm_2.getStrategiesWithParams)('propose', envelope.data.strategies, voterAddress, envelope.data, this.networkConfig);
        const spaceInterface = new abi_1.Interface(Space_json_1.default);
        const functionData = spaceInterface.encodeFunctionData('vote', [
            voterAddress,
            envelope.data.proposal,
            envelope.data.choice,
            userVotingStrategies,
            envelope.data.metadataUri
        ]);
        const selector = functionData.slice(0, 10);
        const calldata = `0x${functionData.slice(10)}`;
        const authenticator = (0, evm_1.getAuthenticator)(envelope.data.authenticator, this.networkConfig);
        if (!authenticator) {
            throw new Error('Invalid authenticator');
        }
        const { abi, args } = authenticator.createCall(envelope, selector, [calldata]);
        const authenticatorContract = new contracts_1.Contract(envelope.data.authenticator, abi, signer);
        const promise = authenticatorContract.authenticate(...args);
        return opts.noWait ? null : promise;
    }
    async execute({ signer, space, proposal, executionParams }, opts = {}) {
        const spaceContract = new contracts_1.Contract(space, Space_json_1.default, signer);
        const promise = spaceContract.execute(proposal, executionParams);
        return opts.noWait ? null : promise;
    }
    async executeQueuedProposal({ signer, executionStrategy, executionParams }, opts = {}) {
        const executionStrategyContract = new contracts_1.Contract(executionStrategy, TimelockExecutionStrategy_json_1.default, signer);
        const promise = executionStrategyContract.executeQueuedProposal(executionParams);
        return opts.noWait ? null : promise;
    }
    async vetoExecution({ signer, executionStrategy, executionHash }, opts = {}) {
        const executionStrategyContract = new contracts_1.Contract(executionStrategy, TimelockExecutionStrategy_json_1.default, signer);
        const promise = executionStrategyContract.veto(executionHash);
        return opts.noWait ? null : promise;
    }
    async cancel({ signer, space, proposal }, opts = {}) {
        const spaceContract = new contracts_1.Contract(space, Space_json_1.default, signer);
        const promise = spaceContract.cancel(proposal);
        return opts.noWait ? null : promise;
    }
    async getProposalStatus({ signer, space, proposal }) {
        const spaceContract = new contracts_1.Contract(space, Space_json_1.default, signer);
        return spaceContract.getProposalStatus(proposal);
    }
    async updateSettings({ signer, space, settings }, opts = {}) {
        const spaceContract = new contracts_1.Contract(space, Space_json_1.default, signer);
        const promise = spaceContract.updateSettings({
            minVotingDuration: settings.minVotingDuration ?? NO_UPDATE_UINT32,
            maxVotingDuration: settings.maxVotingDuration ?? NO_UPDATE_UINT32,
            votingDelay: settings.votingDelay ?? NO_UPDATE_UINT32,
            metadataURI: settings.metadataUri ?? NO_UPDATE_STRING,
            daoURI: settings.daoUri ?? NO_UPDATE_STRING,
            proposalValidationStrategy: settings.proposalValidationStrategy ?? {
                addr: NO_UPDATE_ADDRESS,
                params: '0x00'
            },
            proposalValidationStrategyMetadataURI: settings.proposalValidationStrategyMetadataUri ?? '',
            authenticatorsToAdd: settings.authenticatorsToAdd ?? [],
            authenticatorsToRemove: settings.authenticatorsToRemove ?? [],
            votingStrategiesToAdd: settings.votingStrategiesToAdd ?? [],
            votingStrategiesToRemove: settings.votingStrategiesToRemove ?? [],
            votingStrategyMetadataURIsToAdd: settings.votingStrategyMetadataUrisToAdd ?? []
        });
        return opts.noWait ? null : promise;
    }
    async setMaxVotingDuration({ signer, space, maxVotingDuration }, opts = {}) {
        return this.updateSettings({
            signer,
            space,
            settings: {
                maxVotingDuration
            }
        }, opts);
    }
    async setMinVotingDuration({ signer, space, minVotingDuration }, opts = {}) {
        return this.updateSettings({
            signer,
            space,
            settings: {
                minVotingDuration
            }
        }, opts);
    }
    async setMetadataUri({ signer, space, metadataUri }, opts = {}) {
        return this.updateSettings({
            signer,
            space,
            settings: {
                metadataUri
            }
        }, opts);
    }
    async setVotingDelay({ signer, space, votingDelay }, opts = {}) {
        return this.updateSettings({
            signer,
            space,
            settings: {
                votingDelay
            }
        }, opts);
    }
    async transferOwnership({ signer, space, owner }, opts = {}) {
        const spaceContract = new contracts_1.Contract(space, Space_json_1.default, signer);
        const promise = spaceContract.transferOwnership(owner);
        return opts.noWait ? null : promise;
    }
}
exports.EthereumTx = EthereumTx;
