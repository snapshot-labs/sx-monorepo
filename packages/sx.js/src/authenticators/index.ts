import vanillaAuthenticator from './vanilla';
import ethSigAuthenticator from './ethSig';
import * as utils from '../utils';
import type { Authenticator } from '../types';

const defaultAuthenticators = {
  '0x05e1f273ca9a11f78bfb291cbe1b49294cf3c76dd48951e7ab7db6d9fb1e7d62': vanillaAuthenticator,
  '0x064cce9272197eba6353f5bbf060e097e516b411e66e83a9cf5910a08697df14': ethSigAuthenticator
};

export function getAuthenticator(
  address: string,
  authenticators: any = defaultAuthenticators
): Authenticator | null {
  const authenticator = authenticators[utils.encoding.hexPadLeft(address)];
  if (!authenticator) return null;

  return authenticator;
}
