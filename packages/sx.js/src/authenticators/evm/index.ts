import createVanillaAuthenticator from './vanilla';
import createEthTxAuthenticator from './ethTx';
import type { Authenticator, NetworkConfig } from '../../types';

export function getAuthenticator(
  address: string,
  networkConfig: NetworkConfig
): Authenticator<'evm'> | null {
  const authenticator = networkConfig.authenticators[address];
  if (!authenticator) return null;

  if (authenticator.type === 'vanilla') {
    return createVanillaAuthenticator();
  }

  if (authenticator.type === 'ethTx') {
    return createEthTxAuthenticator();
  }

  return null;
}
