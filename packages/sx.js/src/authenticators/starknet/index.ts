import createEthSigAuthenticator from './ethSig';
import createEthTxAuthenticator from './ethTx';
import createStarkSigAuthenticator from './starkSig';
import createStarkTxAuthenticator from './starkTx';
import createVanillaAuthenticator from './vanilla';
import { Authenticator } from '../../clients/starknet/types';
import { NetworkConfig } from '../../types';
import { hexPadLeft } from '../../utils/encoding';

export function getAuthenticator(
  address: string,
  networkConfig: NetworkConfig
): Authenticator | null {
  const authenticator = networkConfig.authenticators[hexPadLeft(address)];
  if (!authenticator) return null;

  if (authenticator.type === 'vanilla') {
    return createVanillaAuthenticator();
  }

  if (authenticator.type === 'ethSig') {
    return createEthSigAuthenticator();
  }

  if (authenticator.type === 'ethTx') {
    return createEthTxAuthenticator();
  }

  if (authenticator.type === 'starkSig') {
    return createStarkSigAuthenticator();
  }

  if (authenticator.type === 'starkTx') {
    return createStarkTxAuthenticator();
  }

  return null;
}
