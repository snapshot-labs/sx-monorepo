import { BigNumberish } from '@ethersproject/bignumber';

export type ExecutorType =
  | 'SimpleQuorumVanilla'
  | 'SimpleQuorumAvatar'
  | 'SimpleQuorumTimelock'
  | 'EthRelayer'
  | 'Axiom'
  | 'Isokratia';

export type VanillaAuthenticatorConfig = {
  type: 'vanilla';
};

export type EthTxAuthenticatorConfig = {
  type: 'ethTx';
};

export type EthSigAuthenticatorConfig = {
  type: 'ethSig';
};

export type EthSigV2AuthenticatorConfig = {
  type: 'ethSigV2';
};

export type StarkSigAuthenticatorConfig = {
  type: 'starkSig';
};

export type StarkTxAuthenticatorConfig = {
  type: 'starkTx';
};

export type VanillaStrategyConfig = {
  type: 'vanilla';
};

export type CompStrategyConfig = {
  type: 'comp';
};

export type OzVotesStrategyConfig = {
  type: 'ozVotes';
};

export type ApeGasStrategyConfig = {
  type: 'apeGas';
};

export type Erc20VotesStrategyConfig = {
  type: 'erc20Votes';
};

export type WhitelistStrategyConfig = {
  type: 'whitelist';
};

export type EvmSlotValueStrategyConfig = {
  type: 'evmSlotValue';
};

export type OzVotesStorageProofStrategyConfig = {
  type: 'ozVotesStorageProof';
  params: {
    trace: 208 | 224;
  };
};

export type NetworkConfig = {
  eip712ChainId: string;
  spaceFactory: string;
  l1AvatarExecutionStrategyFactory: string;
  l1AvatarExecutionStrategyImplementation: string;
  masterSpace: string;
  starknetCommit: string;
  starknetCore: string;
  feeEstimateOverride?: string;
  herodotusAccumulatesChainId: number;
  authenticators: {
    [key: string]:
      | VanillaAuthenticatorConfig
      | EthTxAuthenticatorConfig
      | EthSigAuthenticatorConfig
      | EthSigV2AuthenticatorConfig
      | StarkSigAuthenticatorConfig
      | StarkTxAuthenticatorConfig
      | undefined;
  };
  strategies: {
    [key: string]:
      | VanillaStrategyConfig
      | CompStrategyConfig
      | OzVotesStrategyConfig
      | ApeGasStrategyConfig
      | Erc20VotesStrategyConfig
      | WhitelistStrategyConfig
      | EvmSlotValueStrategyConfig
      | OzVotesStorageProofStrategyConfig
      | undefined;
  };
};

export type EvmNetworkConfig = Omit<
  NetworkConfig,
  | 'eip712ChainId'
  | 'spaceFactory'
  | 'l1AvatarExecutionStrategyFactory'
  | 'l1AvatarExecutionStrategyImplementation'
  | 'starknetCommit'
  | 'starknetCore'
  | 'herodotusAccumulatesChainId'
> & {
  eip712ChainId: number;
  maxPriorityFeePerGas?: BigNumberish;
  proxyFactory: string;
  executionStrategiesImplementations: {
    [key in ExecutorType]?: string;
  };
};

export type OffchainNetworkConfig = {
  eip712ChainId: 1 | 5;
};
