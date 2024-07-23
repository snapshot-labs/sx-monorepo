import type { Authenticator } from '../../clients/evm/types';
import type { EvmNetworkConfig } from '../../types';
import createEthSigAuthenticator from './ethSig';
import createEthTxAuthenticator from './ethTx';
import createVanillaAuthenticator from './vanilla';

export function getAuthenticator(
  address: string,
  networkConfig: EvmNetworkConfig
): Authenticator | null {
  const authenticator = networkConfig.authenticators[address];
  if (!authenticator) return null;

  if (authenticator.type === 'vanilla') {
    return createVanillaAuthenticator();
  }

  if (authenticator.type === 'ethTx') {
    return createEthTxAuthenticator();
  }

  if (authenticator.type === 'ethSig') {
    return createEthSigAuthenticator();
  }

  return null;
}
