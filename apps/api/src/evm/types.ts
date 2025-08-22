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

export type EVMConfig = {
  indexerName: NetworkID;
  snapshotXConfig?: SnapshotXConfig;
  governorBravoConfig?: GovernorBravoConfig;
} & CheckpointConfig;
