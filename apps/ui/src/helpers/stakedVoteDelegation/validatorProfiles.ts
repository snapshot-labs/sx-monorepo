import { StakedDelegationNetworkId } from './config';

/**
 * Validator profiles shown on the Delegation page.
 *
 * Validators add or update their entry with a pull request. Keys are staker
 * addresses (lowercase, 0x + 64 hex characters). Set `verified: true` only
 * after the Starknet Foundation has confirmed the staker address belongs to
 * the named operator.
 */
export type ValidatorProfile = {
  name: string;
  website?: string;
  /** One or two sentences: who runs it and how it approaches governance. */
  about?: string;
  verified?: boolean;
};

export const VALIDATOR_PROFILES: Record<
  StakedDelegationNetworkId,
  Record<string, ValidatorProfile>
> = {
  sn: {},
  'sn-sep': {}
};
