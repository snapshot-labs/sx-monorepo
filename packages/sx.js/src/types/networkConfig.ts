export type VanillaAuthenticatorConfig = {
  type: 'vanilla';
};

export type EthSigAuthenticatorConfig = {
  type: 'ethSig';
};

export type VanillaStrategyConfig = {
  type: 'vanilla';
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
  authenticators: {
    [key: string]: VanillaAuthenticatorConfig | EthSigAuthenticatorConfig | undefined;
  };
  strategies: { [key: string]: VanillaStrategyConfig | SingleSlotProofStrategyConfig | undefined };
  executors: {
    [key: string]:
      | StarknetExecutionConfig
      | VanillaExecutionConfig
      | EthRelayerExecutionConfig
      | undefined;
  };
};
