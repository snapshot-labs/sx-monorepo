import createVanillaAuthenticator from './vanilla';
import createEthSigAuthenticator from './ethSig';
import { hexPadLeft } from '../../utils/encoding';
import type { Authenticator, NetworkConfig } from '../../types';

export function getAuthenticator(
  address: string,
  networkConfig: NetworkConfig
): Authenticator<'starknet'> | null {
  const authenticator = networkConfig.authenticators[hexPadLeft(address)];
  if (!authenticator) return null;

  if (authenticator.type === 'vanilla') {
    return createVanillaAuthenticator();
  }

  if (authenticator.type === 'ethSig') {
    return createEthSigAuthenticator();
  }

  return null;
}
