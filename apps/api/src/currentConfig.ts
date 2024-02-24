import baseConfig from './config.json';
import { networkNodeUrl, networkProperties } from './overrrides';

export default {
  ...baseConfig,
  network_node_url: networkNodeUrl,
  sources: baseConfig.sources.map((source, i) => {
    if (i !== 0) return source;

    return {
      ...source,
      contract: networkProperties.factoryAddress,
      start: networkProperties.startBlock
    };
  })
};
