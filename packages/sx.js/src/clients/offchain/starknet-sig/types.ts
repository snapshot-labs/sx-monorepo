export const baseDomain = {
  name: 'sx-starknet',
  version: '0.1.0',
  revision: 1
};

export const domainTypes = {
  StarknetDomain: [
    { name: 'name', type: 'shortstring' },
    { name: 'version', type: 'shortstring' },
    { name: 'revision', type: 'shortstring' },
    { name: 'chainId', type: 'shortstring' }
  ]
};

export const aliasTypes = {
  StarknetDomain: domainTypes.StarknetDomain,
  SetAlias: [
    { name: 'from', type: 'ContractAddress' },
    { name: 'alias', type: 'string' },
    { name: 'timestamp', type: 'felt' }
  ]
};
