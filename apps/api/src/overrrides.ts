export const networkNodeUrl =
  process.env.NETWORK_NODE_URL ||
  'https://starknet-goerli.infura.io/v3/46a5dd9727bf48d4a132672d3f376146';

const mainnetConfig = {
  factoryAddress: '0x250e28c97e729842190c3672f9fcf8db0fc78b8080e87a894831dc69e4f4439',
  propositionPowerValidationStrategyAddress:
    '0x1b28f95cbc5bcbe52014ef974d609f14497517f31d3c9e079a2464edf988751',
  startBlock: 445498
};

const goerliConfig = {
  factoryAddress: '0x63c62258e1ba4d9ad72eab809ea5c3d1a4545b721bc444d6068ced6246c2f3c',
  propositionPowerValidationStrategyAddress:
    '0x3ff398ab4e0aa9109c0cc889ff968c6215053a5e2176519b59f8ba87927c631',
  startBlock: 907731
};

export const networkProperties = process.env.NETWORK === 'SN_MAIN' ? mainnetConfig : goerliConfig;
