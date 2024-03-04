import createOnlyMembersStrategy from './only-members';
import createRemoteValidateStrategy from './remote-validate';
import createRemoteVpStrategy from './remote-vp';
import { Strategy } from '../../clients/offchain/types';

export function getStrategy(name: string): Strategy | null {
  if (name === 'only-members') return createOnlyMembersStrategy();

  if (['any', 'basic', 'passport-gated', 'arbitrum', 'karma-eas-attestation'].includes(name)) {
    return createRemoteValidateStrategy(name);
  }

  return createRemoteVpStrategy();
}
