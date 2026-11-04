import { verify } from '../../../src/writer/vote';

const ID = `0x${'7a'.repeat(32)}`;
const VOTER = '0x00000000000000000000000000000000000000c1';
const NOW = 1_800_000_000;

const mockGetProposal = jest.fn();
jest.mock('../../../src/helpers/actions', () => ({
  __esModule: true,
  ...jest.requireActual('../../../src/helpers/actions'),
  getProposal: (...args: any[]) => mockGetProposal(...args)
}));

const mockGetVp = jest.fn();
const mockValidate = jest.fn();
jest.mock('@snapshot-labs/snapshot.js', () => {
  const original = jest.requireActual('@snapshot-labs/snapshot.js');
  return {
    ...original,
    utils: {
      ...original.utils,
      getVp: (...args: any[]) => mockGetVp(...args),
      validate: (...args: any[]) => mockValidate(...args)
    }
  };
});

// The ballot check is tested in te.test.ts and teBallotPool.test.ts. Here we only
// check that verify() calls it and handles the result.
const mockVerifyTeBallot = jest.fn();
jest.mock('../../../src/helpers/te', () => ({
  __esModule: true,
  ...jest.requireActual('../../../src/helpers/te'),
  verifyTeBallot: (...args: any[]) => mockVerifyTeBallot(...args)
}));

jest.mock('../../../src/helpers/sgpAttestation', () => ({
  __esModule: true,
  ...jest.requireActual('../../../src/helpers/sgpAttestation'),
  eligibilityPublicKey: jest.fn(async () => `0x${'aa'.repeat(48)}`)
}));

const mockIsKeyRotated = jest.fn();
jest.mock('../../../src/helpers/teEligibility', () => ({
  __esModule: true,
  KEY_ROTATED_MESSAGE: jest.requireActual('../../../src/helpers/teEligibility')
    .KEY_ROTATED_MESSAGE,
  isEligibilityKeyRotated: (...args: any[]) => mockIsKeyRotated(...args)
}));

function proposal(extra: Record<string, unknown> = {}) {
  return {
    id: ID,
    space: 'test.eth',
    type: 'single-choice',
    choices: ['For', 'Against', 'Abstain'],
    start: NOW - 100,
    end: NOW + 100,
    privacy: '',
    network: '1',
    snapshot: 1,
    strategies: [],
    validation: { name: 'any', params: {} },
    ...extra
  };
}

function body(payload: Record<string, unknown> = {}, timestamp = NOW) {
  return {
    address: VOTER,
    msg: JSON.stringify({
      space: 'test.eth',
      timestamp: String(timestamp),
      type: 'vote',
      payload: {
        proposal: ID,
        choice: 1,
        app: '',
        reason: '',
        metadata: {},
        ...payload
      }
    })
  };
}

/** A private ballot's `choice`: the envelope with its credential. */
function ballot(attestation: Record<string, unknown> = {}) {
  return {
    choice: {
      ciphertexts: [],
      attestation: { electionId: ID, weight: 7, nonce: 1, ...attestation }
    }
  };
}

// verify() reads the clock through Date.now.
const setNow = (ms: number) => jest.spyOn(Date, 'now').mockReturnValue(ms);

beforeEach(() => {
  setNow(NOW * 1000);
  mockGetProposal.mockReset().mockResolvedValue(proposal());
  mockGetVp
    .mockReset()
    .mockResolvedValue({ vp: 10, vp_by_strategy: [10], vp_state: 'final' });
  mockVerifyTeBallot.mockReset().mockResolvedValue({ ok: true });
  mockValidate.mockReset().mockResolvedValue(true);
  mockIsKeyRotated.mockReset().mockResolvedValue(false);
});

describe('writer/vote', () => {
  describe('verify()', () => {
    it.todo('rejects if the schema is invalid');
    it.todo('rejects if the proposal is not found');
    it.todo('rejects if the voting window is invalid');

    describe('when shutter is enabled', () => {
      it.todo('rejects if passing a reason');
      it.todo('rejects if the choices are invalid');
    });

    describe('when the proposal is shutter-elgamal', () => {
      beforeEach(() =>
        mockGetProposal.mockResolvedValue(
          proposal({ privacy: 'shutter-elgamal', type: 'weighted' })
        )
      );

      // A missing scheme means the supported one.
      it.each([[undefined], ['ATTESTATION_V1']])(
        'accepts a ballot the full check accepts (scheme %p)',
        async scheme => {
          const payload = ballot({ scheme });
          await expect(verify(body(payload))).resolves.toMatchObject({
            vp: { vp: 10 }
          });
          expect(mockVerifyTeBallot).toHaveBeenCalledTimes(1);
          const [, voter, choice] = mockVerifyTeBallot.mock.calls[0];
          expect(voter).toBe(VOTER.toLowerCase());
          expect(JSON.parse(choice)).toEqual(payload.choice);
        }
      );

      it.each([
        ['invalid_proof', 'invalid private ballot: invalid_proof'],
        ['sequencer_busy', 'sequencer busy, please try again in a moment'],
        [
          'verifier_unavailable',
          'could not check the private ballot, please try again in a moment'
        ]
      ])(
        'rejects a ballot the full check refuses (%s)',
        async (reason, msg) => {
          mockVerifyTeBallot.mockResolvedValue({ ok: false, reason });
          await expect(verify(body(ballot()))).rejects.toBe(msg);
        }
      );

      it.each([
        [
          'a reason',
          { ...ballot(), reason: 'because' },
          'reason not allowed with shutter-elgamal'
        ],
        ['no credential', { choice: { ciphertexts: [] } }, 'no credential'],
        [
          'a credential for another proposal',
          ballot({ electionId: `0x${'00'.repeat(32)}` }),
          'different proposal'
        ],
        [
          'a non-string credential election id',
          ballot({ electionId: 1 }),
          'different proposal'
        ],
        [
          'a quoted weight',
          ballot({ weight: '7' }),
          'weight must be an integer'
        ],
        ['a quoted nonce', ballot({ nonce: '1' }), 'nonce must be an integer'],
        [
          'a fractional weight',
          ballot({ weight: 7.5 }),
          'weight must be an integer'
        ],
        [
          'an unsupported credential scheme',
          ballot({ scheme: 'BROKEN' }),
          'unsupported credential scheme'
        ],
        // The full check ignores fields it does not know, but the whole choice is
        // stored, so an extra field could pad a ballot to the 1 MB vote limit.
        [
          'an extra field on the ballot',
          { choice: { ...ballot().choice, pad: 'x' } },
          'unexpected field pad'
        ],
        [
          'an extra field on the credential',
          ballot({ pad: 'x' }),
          'unexpected field pad'
        ],
        [
          'an extra field on a ciphertext',
          {
            choice: {
              ...ballot().choice,
              ciphertexts: [{ c1: '0x', c2: '0x', pad: 'x' }]
            }
          },
          'unexpected field pad'
        ]
      ])(
        'rejects %s before the full check',
        async (_label, payload, reason) => {
          await expect(verify(body(payload))).rejects.toMatch(reason);
          expect(mockVerifyTeBallot).not.toHaveBeenCalled();
        }
      );

      // The ballot check takes 10-80 s of worker time, so the cheaper checks
      // must refuse these votes before it runs.
      it('rejects a voter who fails validation before the full check', async () => {
        mockGetProposal.mockResolvedValue(
          proposal({
            privacy: 'shutter-elgamal',
            type: 'weighted',
            validation: { name: 'passport-gated', params: {} }
          })
        );
        mockValidate.mockResolvedValue(false);
        await expect(verify(body(ballot()))).rejects.toBe(
          'failed vote validation'
        );
        expect(mockVerifyTeBallot).not.toHaveBeenCalled();
      });

      // Its credentials would not verify against the frozen key, so the vote could
      // never count. Ballots cast before the rotation still do.
      it('rejects a vote once the eligibility key was rotated', async () => {
        mockIsKeyRotated.mockResolvedValue(true);
        await expect(verify(body(ballot()))).rejects.toBe(
          "this proposal's eligibility key was rotated; it can no longer accept votes"
        );
        expect(mockVerifyTeBallot).not.toHaveBeenCalled();
      });

      it('rejects voting power below 0.5 before the full check', async () => {
        mockGetVp.mockResolvedValue({ vp: 0.4, vp_by_strategy: [0.4] });
        await expect(verify(body(ballot()))).rejects.toMatch(
          'voting power too low'
        );
        expect(mockVerifyTeBallot).not.toHaveBeenCalled();
      });

      it('rejects a vote timestamped exactly at proposal.end', async () => {
        setNow((NOW + 100) * 1000);
        await expect(verify(body(ballot(), NOW + 100))).rejects.toBe(
          'not in voting window'
        );
      });
    });

    // Neither the half-open window nor the 0.5 floor applies to public proposals.
    it('leaves public proposals unchanged', async () => {
      setNow((NOW + 100) * 1000);
      mockGetVp.mockResolvedValue({ vp: 0.4, vp_by_strategy: [0.4] });
      await expect(verify(body({}, NOW + 100))).resolves.toMatchObject({
        vp: { vp: 0.4 }
      });
      expect(mockVerifyTeBallot).not.toHaveBeenCalled();
    });

    it.todo('rejects when the choice is invalid');
    it.todo('rejects when if fails <snapshot SDK vote validation>');
    it.todo('rejects when if fails to check validation with snapshot SDK');
  });
});
