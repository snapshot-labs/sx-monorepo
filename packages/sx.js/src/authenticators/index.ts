import vanillaAuthenticator from './vanilla';
import ethSigAuthenticator from './ethSig';
import * as utils from '../utils';
import type { Authenticator } from '../types';

const authenticators = {
  '0x036f53ac6efe16403267873d307db90b5cc10c97fd3353af3107609bb63f9f83': vanillaAuthenticator,
  '0x04bbd4959806784f2ad7541e36eda88d9b3dff1baef60b39862abc171f3eed38': ethSigAuthenticator
};

export function getAuthenticator(address: string): Authenticator | null {
  const authenticator = authenticators[utils.encoding.hexPadRight(address)];
  if (!authenticator) return null;

  return authenticator;
}
