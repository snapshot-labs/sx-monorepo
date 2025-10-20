import { CheckpointConfig } from '@snapshot-labs/checkpoint';

export type NetworkID =
  | 'eth'
  | 'sep'
  | 'oeth'
  | 'matic'
  | 'arb1'
  | 'base'
  | 'mnt'
  | 'ape'
  | 'curtis';

export type Protocols = {
  snapshotX: boolean;
  governorBravo: boolean;
  openZeppelin: boolean;
};

export type SnapshotXConfig = {
  chainId: number;
  manaRpcUrl: string;
  masterSpace: string;
  masterSimpleQuorumAvatar: string;
  masterSimpleQuorumTimelock: string;
  masterAxiom: string | null;
  propositionPowerValidationStrategyAddress: string;
  apeGasStrategy: string | null;
  apeGasStrategyDelay: number;
};

export type GovernorBravoConfig = {
  chainId: number;
};

export type OpenZeppelinConfig = {
  chainId: number;
};

export type EVMConfig = {
  indexerName: NetworkID;
  snapshotXConfig?: SnapshotXConfig;
  governorBravoConfig?: GovernorBravoConfig;
  openZeppelinConfig?: OpenZeppelinConfig;
} & CheckpointConfig;

export type PartialConfig = {
  sources: NonNullable<EVMConfig['sources']>;
  templates: EVMConfig['templates'];
  abis: EVMConfig['abis'];
};
