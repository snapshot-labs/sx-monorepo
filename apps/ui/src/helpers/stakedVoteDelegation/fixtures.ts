import { ValidatorPool } from './config';
import { ValidatorProfile } from './validatorProfiles';

/**
 * Local testing fixtures. They fake staking state only (pool membership and
 * validator status); registry reads and writes stay live on Sepolia.
 *
 * Only active in dev builds with VITE_STAKED_DELEGATION_FIXTURES=true.
 */
export const FIXTURES_ENABLED =
  import.meta.env.DEV &&
  import.meta.env.VITE_STAKED_DELEGATION_FIXTURES === 'true';

const STRK = 10n ** 18n;

const toWei = (amount: number) => (BigInt(amount) * STRK).toString();

/** Test validator (view with `?as=` or connect it as the staker). */
const TEST_VALIDATOR: ValidatorPool = {
  staker: '0x0378b9c3cb6be32d087d1af8a91c1484226ac8b009f502e12b06ffd46d94f014',
  pool: '0x0f1f000000000000000000000000000000000000000000000000000000000001',
  delegated: toWei(4_820_000),
  own: toWei(250_000),
  commission: 500,
  exiting: false
};

/**
 * Sepolia accounts we control, used as fixture validators so that every
 * resolution state is backed by real registry entries:
 * - "Declined": called set_accepts_default_delegations(false)
 * - "Vote receiver": called set_vote_receiver(0x025f…3a85)
 */
const DECLINED_VALIDATOR: ValidatorPool = {
  staker: '0x032cca99f07972f26d60e8b19029b2e6ffd6388bfa97b813bea8fa28cb33cf38',
  pool: '0x0f1f000000000000000000000000000000000000000000000000000000000002',
  delegated: toWei(1_340_000),
  own: toWei(60_000),
  commission: 800,
  exiting: false
};

const RECEIVER_VALIDATOR: ValidatorPool = {
  staker: '0x04085479aab76b36083a42fc3fc2dee4c967cdda53562334c22a0899e504c6e6',
  pool: '0x0f1f000000000000000000000000000000000000000000000000000000000003',
  delegated: toWei(2_150_000),
  own: toWei(120_000),
  commission: 1000,
  exiting: false
};

/** Sample profiles, as validators would add them to validatorProfiles.ts. */
export const FIXTURE_PROFILES: Record<string, ValidatorProfile> =
  FIXTURES_ENABLED
    ? {
        [RECEIVER_VALIDATOR.staker]: {
          name: 'Cinder Staking (test)',
          website: 'https://example.com',
          about:
            'Test profile. Votes through a separate hot wallet and publishes its reasoning before each vote.',
          verified: true
        },
        [DECLINED_VALIDATOR.staker]: {
          name: 'Basalt Nodes (test)',
          about:
            'Test profile. Declined default delegations so its delegators keep their own vote.'
        }
      }
    : {};

export const FIXTURE_VALIDATORS: ValidatorPool[] = FIXTURES_ENABLED
  ? [TEST_VALIDATOR, RECEIVER_VALIDATOR, DECLINED_VALIDATOR]
  : [];

/** Test delegator, spread across four validators. */
const FIXTURE_MEMBERSHIPS: Record<
  string,
  { staker: string; amount: number }[]
> = {
  '0x03a22bd644251bc609838d8831f0dfe9a450dc4e76dd93970cef13655976e931': [
    { staker: TEST_VALIDATOR.staker, amount: 12_500 },
    { staker: RECEIVER_VALIDATOR.staker, amount: 6_250 },
    {
      // Largest real Sepolia validator
      staker:
        '0x02993cc471faf72a95e25ec2b1698c8bb1f5108de50818995abc8c32bd5ebbc8',
      amount: 3_000
    },
    { staker: DECLINED_VALIDATOR.staker, amount: 1_750 }
  ]
};

export function getFixtureMemberships(member: string) {
  if (!FIXTURES_ENABLED) return null;
  const entries = FIXTURE_MEMBERSHIPS[member.toLowerCase()];
  return (
    entries?.map(entry => ({
      staker: entry.staker,
      amount: BigInt(entry.amount) * STRK
    })) ?? null
  );
}

export function isFixtureStaker(address: string) {
  return FIXTURE_VALIDATORS.some(
    validator => validator.staker.toLowerCase() === address.toLowerCase()
  );
}

/**
 * Sample votes on the 6 most recent proposals (newest first), so the voting
 * record can be seen locally. `1` is "For" on votes and the first option on
 * polls; `null` means the address did not vote.
 */
const FIXTURE_VOTES: Record<string, (number | null)[]> = {
  // Test validator: votes on almost everything
  [TEST_VALIDATOR.staker]: [1, 1, null, 1, 1, 1],
  // Cinder's vote receiver
  '0x025f527f2967f29ef0f84fb9b9ce3ef6c87f6fac6e800e7b2afc287281fe3a85': [
    null,
    1,
    null,
    null,
    1,
    null
  ]
};

export function getFixtureVotes(voter: string) {
  if (!FIXTURES_ENABLED) return null;
  return FIXTURE_VOTES[voter.toLowerCase()] ?? null;
}
