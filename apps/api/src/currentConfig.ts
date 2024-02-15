import baseConfig from './config.json';
import { networkNodeUrl, networkProperties } from './overrrides';

export default {
  ...baseConfig,
  network_node_url: networkNodeUrl,
  sources: [
    {
      ...baseConfig.sources[0],
      contract: networkProperties.factoryAddress,
      start: networkProperties.startBlock
    }
  ]
};
