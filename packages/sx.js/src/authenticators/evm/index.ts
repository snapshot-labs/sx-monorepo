import createVanillaAuthenticator from './vanilla';
import createEthTxAuthenticator from './ethTx';
import type { Authenticator, EthCall, NetworkConfig } from '../../types';

export function getAuthenticator(
  address: string,
  networkConfig: NetworkConfig
): Authenticator<EthCall> | null {
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
