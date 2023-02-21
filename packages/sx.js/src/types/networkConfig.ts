export type VanillaAuthenticatorConfig = {
  type: 'vanilla';
};

export type EthTxAuthenticatorConfig = {
  type: 'ethTx';
};

export type EthSigAuthenticatorConfig = {
  type: 'ethSig';
};

export type VanillaStrategyConfig = {
  type: 'vanilla';
};

export type CompStrategyConfig = {
  type: 'comp';
};

export type WhitelistStrategyConfig = {
  type: 'whitelist';
};

export type SingleSlotProofStrategyConfig = {
  type: 'singleSlotProof';
  params: {
    fossilL1HeadersStoreAddress: string;
    fossilFactRegistryAddress: string;
  };
};

export type StarknetExecutionConfig = {
  type: 'starknet';
};

export type VanillaExecutionConfig = {
  type: 'vanilla';
};

export type EthRelayerExecutionConfig = {
  type: 'ethRelayer';
  params: {
    destination: string;
    chainId: number;
  };
};

export type NetworkConfig = {
  spaceFactory: string;
  authenticators: {
    [key: string]:
      | VanillaAuthenticatorConfig
      | EthTxAuthenticatorConfig
      | EthSigAuthenticatorConfig
      | undefined;
  };
  strategies: {
    [key: string]:
      | VanillaStrategyConfig
      | CompStrategyConfig
      | WhitelistStrategyConfig
      | SingleSlotProofStrategyConfig
      | undefined;
  };
  executors: {
    [key: string]:
      | StarknetExecutionConfig
      | VanillaExecutionConfig
      | EthRelayerExecutionConfig
      | undefined;
  };
};
