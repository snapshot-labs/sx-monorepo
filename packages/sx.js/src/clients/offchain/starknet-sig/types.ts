export const baseDomain = {
  name: 'sx-starknet',
  version: '0.1.0'
};

export const domainTypes = {
  StarkNetDomain: [
    { name: 'name', type: 'felt' },
    { name: 'version', type: 'felt' },
    { name: 'chainId', type: 'felt' }
  ]
};

export const aliasTypes = {
  StarkNetDomain: domainTypes.StarkNetDomain,
  SetAlias: [
    { name: 'from', type: 'felt' },
    { name: 'alias', type: 'felt' },
    { name: 'timestamp', type: 'felt' }
  ]
};
