import vanillaAuthenticator from './vanilla';
import ethSigAuthenticator from './ethSig';
import * as utils from '../utils';
import type { Authenticator } from '../types';

const authenticators = {
  '0xb32364e042cb948be62a09355595a4b80dfff4eb11a485c1950ace70b0e83500': vanillaAuthenticator,
  '0x06aac1e90da5df37bd59ac52b638a22de15231cbb78353b121df987873d0f369': ethSigAuthenticator
};

export function getAuthenticator(address: string): Authenticator | null {
  const authenticator = authenticators[utils.encoding.hexPadRight(address)];
  if (!authenticator) return null;

  return authenticator;
}
