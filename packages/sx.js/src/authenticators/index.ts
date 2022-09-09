import vanillaAuthenticator from './vanilla';
import ethSigAuthenticator from './ethSig';
import type { Authenticator } from '../types';

const authenticators = {
  '0x6ad07205a4d725c5c2b10c4f5fbdfaaa351c742fce7a5a22b2b56fd8d5afd62': vanillaAuthenticator,
  '0x594a81b66c3aa2c64577916f727e1307b60c9d6afa80b6f5ca3e3049c40f643': ethSigAuthenticator
};

export function getAuthenticator(address: string): Authenticator | null {
  const authenticator = authenticators[address];
  if (!authenticator) return null;

  return authenticator;
}
