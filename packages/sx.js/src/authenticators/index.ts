import createVanillaAuthenticator from './vanilla';
import createEthSigAuthenticator from './ethSig';
import * as utils from '../utils';
import type { Authenticator, NetworkConfig } from '../types';

export function getAuthenticator(
  address: string,
  networkConfig: NetworkConfig
): Authenticator | null {
  const authenticator = networkConfig.authenticators[utils.encoding.hexPadLeft(address)];
  if (!authenticator) return null;

  if (authenticator.type === 'vanilla') {
    return createVanillaAuthenticator();
  }

  if (authenticator.type === 'ethSig') {
    return createEthSigAuthenticator();
  }

  return null;
}
