import Checkpoint, {
  BaseIndexer,
  CheckpointConfig
} from '@snapshot-labs/checkpoint';
import { ENABLED_NETWORKS } from './config';

export function registerIndexer(
  instance: Checkpoint,
  indexerName: string,
  config: CheckpointConfig,
  indexer: BaseIndexer
) {
  if (ENABLED_NETWORKS && !ENABLED_NETWORKS.includes(indexerName)) return;

  instance.addIndexer(indexerName, config, indexer);
}
