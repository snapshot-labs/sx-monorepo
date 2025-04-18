import createEthSigAuthenticator from './ethSig';
import createEthTxAuthenticator from './ethTx';
import createVanillaAuthenticator from './vanilla';
import { Authenticator } from '../../clients/evm/types';
import { EvmNetworkConfig } from '../../types';

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

  if (authenticator.type === 'ethSig' || authenticator.type === 'ethSigV2') {
    return createEthSigAuthenticator(authenticator.type);
  }

  return null;
}
