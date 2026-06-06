// Mock validateSpaceSettings function
jest.mock('../../../src/helpers/spaceValidation', () => ({
  validateSpaceSettings: jest.fn()
}));

import omit from 'lodash/omit';
import * as writer from '../../../src/writer/proposal';
import { spacesGetSpaceFixtures } from '../../fixtures/space';
import input from '../../fixtures/writer-payload/proposal.json';

const FLAGGED_ADDRESSES = ['0x0'];

const LIMITS = {
  'space.active_proposal_limit_per_author': 20,
  'space.ecosystem.proposal_limit_per_day': 150,
  'space.ecosystem.proposal_limit_per_month': 750,
  'space.ecosystem.choices_limit': 20,
  'space.ecosystem.body_length': 10000,
  'space.ecosystem.strategies_limit': 8,
  'space.flagged.proposal_limit_per_day': 5,
  'space.flagged.proposal_limit_per_month': 7,
  'space.flagged.choices_limit': 20,
  'space.flagged.body_length': 10000,
  'space.flagged.strategies_limit': 8,
  'space.default.proposal_limit_per_day': 10,
  'space.default.proposal_limit_per_month': 150,
  'space.default.choices_limit': 20,
  'space.default.body_length': 10000,
  'space.default.strategies_limit': 8,
  'space.turbo.proposal_limit_per_day': 40,
  'space.turbo.proposal_limit_per_month': 200,
  'space.turbo.choices_limit': 1000,
  'space.turbo.body_length': 40000,
  'space.turbo.strategies_limit': 8,
  'space.verified.proposal_limit_per_day': 20,
  'space.verified.proposal_limit_per_month': 100,
  'space.verified.choices_limit': 20,
  'space.verified.body_length': 10000,
  'space.verified.strategies_limit': 6,
  'user.default.follow.limit': 25
};
const ECOSYSTEM_LIST = ['test.eth', 'snapshot.eth'];

jest.mock('../../../src/helpers/options', () => {
  const originalModule = jest.requireActual('../../../src/helpers/options');

  return {
    __esModule: true,
    ...originalModule,
    getList: () => {
      return ECOSYSTEM_LIST;
    },
    getLimits: () => {
      return LIMITS;
    }
  };
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mockGetSpace = jest.fn((_): any => {
  return spacesGetSpaceFixtures;
});
jest.mock('../../../src/helpers/actions', () => {
  const originalModule = jest.requireActual('../../../src/helpers/actions');

  return {
    __esModule: true,
    ...originalModule,
    getSpace: (id: string) => mockGetSpace(id),
    getPremiumNetworkIds: () => ['1', '10', '137', '250']
  };
});

const mockSnapshotUtilsValidate = jest.fn((): any => {
  return true;
});
jest.mock('@snapshot-labs/snapshot.js', () => {
  const originalModule = jest.requireActual('@snapshot-labs/snapshot.js');

  return {
    ...originalModule,
    utils: {
      ...originalModule.utils,
      validate: () => mockSnapshotUtilsValidate()
    }
  };
});

jest.mock('../../../src/helpers/moderation', () => {
  const originalModule = jest.requireActual('../../../src/helpers/moderation');

  return {
    __esModule: true,
    ...originalModule,
    // sha256 of 1.2.3.4
    flaggedIps: [
      '6694f83c9f476da31f5df6bcc520034e7e57d421d247b9d34f49edbfc84a764c'
    ],
    flaggedAddresses: ['0x0']
  };
});

// Get the mocked function after the mock is created
const { validateSpaceSettings: mockValidateSpaceSettings } = jest.requireMock(
  '../../../src/helpers/spaceValidation'
);

const mockGetProposalsCount = jest.spyOn(writer, 'getProposalsCount');
mockGetProposalsCount.mockResolvedValue([
  {
    dayCount: 0,
    monthCount: 0,
    activeProposalsByAuthor: 0
  }
]);

function updateInputPayload(input: any, payload: any) {
  const msg = JSON.parse(input.msg);

  return {
    ...input,
    msg: JSON.stringify({ ...msg, payload: { ...msg.payload, ...payload } })
  };
}

describe('writer/proposal', () => {
  beforeEach(() => {
    // Default validateSpaceSettings to resolve (success)
    mockValidateSpaceSettings.mockResolvedValue(undefined);
  });

  afterEach(jest.clearAllMocks);

  const msg = JSON.parse(input.msg);
  msg.payload.end = Math.floor(Date.now() / 1000) + 60;
  input.msg = JSON.stringify(msg);

  describe('verify()', () => {
    describe('when the schema is invalid', () => {
      const msg = JSON.parse(input.msg);
      const invalidMsg = [
        [
          'unknown field',
          { ...msg, payload: { ...msg.payload, title: 'title' } }
        ],
        ['missing field', { msg, payload: omit(msg.payload, 'name') }],
        [
          'not matching type',
          { ...msg, payload: { ...msg.payload, name: true } }
        ]
      ];

      it.each(invalidMsg)('rejects on %s', async (title: string, val: any) => {
        expect.assertions(1);
        await expect(
          writer.verify({ ...input, msg: JSON.stringify(val) })
        ).rejects.toMatch('format');
      });
    });

    it('rejects if the basic vote choices are not valid', async () => {
      expect.assertions(1);

      const msg = JSON.parse(input.msg);
      msg.payload.type = 'basic';
      msg.payload.choices = ['Good'];

      await expect(
        writer.verify({ ...input, msg: JSON.stringify(msg) })
      ).rejects.toMatch('choices');
    });

    it('does not reject if the basic vote choices are valid', async () => {
      expect.assertions(3);
      mockGetSpace.mockResolvedValueOnce({
        ...spacesGetSpaceFixtures,
        voting: { ...spacesGetSpaceFixtures.voting, type: 'basic' }
      });

      const msg = JSON.parse(input.msg);
      msg.payload.type = 'basic';
      msg.payload.choices = ['For', 'Against', 'Abstain'];

      await expect(
        writer.verify({ ...input, msg: JSON.stringify(msg) })
      ).resolves.toBeUndefined();
      expect(mockGetSpace).toHaveBeenCalledTimes(1);
      expect(mockGetProposalsCount).toHaveBeenCalledTimes(1);
    });

    describe('when the space has set a voting period', () => {
      const VOTING_PERIOD = 120;
      const msg = JSON.parse(input.msg);
      msg.payload.start = Math.floor(Date.now() / 1000) - 60;
      const inputWithVotingPeriod = { ...input, msg: JSON.stringify(msg) };

      it('rejects if the proposal voting period is not matching the space', async () => {
        expect.assertions(2);
        mockGetSpace.mockResolvedValueOnce({
          ...spacesGetSpaceFixtures,
          voting: {
            ...spacesGetSpaceFixtures.voting,
            period: VOTING_PERIOD + 1000
          }
        });

        await expect(writer.verify(inputWithVotingPeriod)).rejects.toMatch(
          'period'
        );
        expect(mockGetSpace).toHaveBeenCalledTimes(1);
      });

      it('does not reject if the proposal voting period is matching the space', async () => {
        expect.assertions(3);
        mockGetSpace.mockResolvedValueOnce({
          ...spacesGetSpaceFixtures,
          voting: { ...spacesGetSpaceFixtures.voting, period: VOTING_PERIOD }
        });

        await expect(
          writer.verify(inputWithVotingPeriod)
        ).resolves.toBeUndefined();
        expect(mockGetSpace).toHaveBeenCalledTimes(1);
        expect(mockGetProposalsCount).toHaveBeenCalledTimes(1);
      });
    });

    describe('when the space has set a voting delay', () => {
      const VOTING_DELAY = 1e6;

      it('rejects if the proposal voting delay is not matching the space', async () => {
        expect.assertions(2);
        mockGetSpace.mockResolvedValueOnce({
          ...spacesGetSpaceFixtures,
          voting: { ...spacesGetSpaceFixtures.voting, delay: VOTING_DELAY }
        });

        await expect(writer.verify(input)).rejects.toMatch('delay');
        expect(mockGetSpace).toHaveBeenCalledTimes(1);
      });

      it('does not reject if the proposal voting delay is matching the space', async () => {
        expect.assertions(3);
        mockGetSpace.mockResolvedValueOnce({
          ...spacesGetSpaceFixtures,
          voting: { ...spacesGetSpaceFixtures.voting, delay: VOTING_DELAY }
        });

        const msg = JSON.parse(input.msg);
        msg.payload.start = msg.timestamp + VOTING_DELAY;

        await expect(
          writer.verify({ ...input, msg: JSON.stringify(msg) })
        ).resolves.toBeUndefined();
        expect(mockGetSpace).toHaveBeenCalledTimes(1);
        expect(mockGetProposalsCount).toHaveBeenCalledTimes(1);
      });
    });

    it('rejects if the voting type is invalid', async () => {
      expect.assertions(2);
      mockGetSpace.mockResolvedValueOnce({
        ...spacesGetSpaceFixtures,
        voting: { ...spacesGetSpaceFixtures.voting, type: 'multiple-choices' }
      });

      await expect(writer.verify(input)).rejects.toMatch('voting');
      expect(mockGetSpace).toHaveBeenCalledTimes(1);
    });

    describe('when the proposal contains flagged contents', () => {
      const invalidInput = [
        [
          'submitted address is flagged',
          { ...input, address: FLAGGED_ADDRESSES[0] }
        ]
      ];

      it.each(invalidInput)('rejects when the %s', async (title, val) => {
        expect.assertions(1);
        await expect(writer.verify(val)).rejects.toMatch(
          'invalid proposal, please contact support'
        );
      });
    });

    describe('when the submitter is not a space member', () => {
      beforeEach(() => {
        mockSnapshotUtilsValidate.mockResolvedValueOnce(false);
      });

      describe('when using a custom of validation', () => {
        it('validates the space validation using snapshot SDK', async () => {
          expect.assertions(2);
          mockGetSpace.mockResolvedValueOnce({
            ...spacesGetSpaceFixtures,
            validation: { name: 'gitcoin' }
          });

          await expect(writer.verify(input)).rejects.toMatch('validation');
          expect(mockSnapshotUtilsValidate).toHaveBeenCalledTimes(1);
        });
      });

      describe('when using the basic validation with a minimum score', () => {
        it('validates the space validation using snapshot SDK', async () => {
          expect.assertions(2);
          mockGetSpace.mockResolvedValueOnce({
            ...spacesGetSpaceFixtures,
            validation: { name: 'basic', params: { minScore: 100 } }
          });

          await expect(writer.verify(input)).rejects.toMatch('validation');
          expect(mockSnapshotUtilsValidate).toHaveBeenCalledTimes(1);
        });
      });

      describe('when using the basic validation with no minimum score', () => {
        it('does not validate the space validation', async () => {
          expect.assertions(2);

          await expect(writer.verify(input)).resolves.toBeUndefined();
          expect(mockSnapshotUtilsValidate).toHaveBeenCalledTimes(0);
        });
      });

      describe('when using the any validation', () => {
        it('does not validate the space validation', async () => {
          expect.assertions(2);

          await expect(writer.verify(input)).resolves.toBeUndefined();
          expect(mockSnapshotUtilsValidate).toHaveBeenCalledTimes(0);
        });
      });

      describe('when the space is using ANY privacy', () => {
        beforeEach(() => {
          mockGetSpace.mockResolvedValueOnce({
            ...spacesGetSpaceFixtures,
            voting: { privacy: 'any' }
          });
        });

        it('accepts a proposal with shutter privacy', () => {
          return expect(
            writer.verify(updateInputPayload(input, { privacy: 'shutter' }))
          ).resolves.toBeUndefined();
        });

        it('accepts a proposal with undefined privacy', () => {
          return expect(
            writer.verify(updateInputPayload(input, { privacy: undefined }))
          ).resolves.toBeUndefined();
        });

        it('accepts a proposal with no privacy', () => {
          return expect(
            writer.verify(updateInputPayload(input, { privacy: '' }))
          ).resolves.toBeUndefined();
        });
      });

      // Fallback as if { privacy: 'any' }
      describe('when the space is missing the privacy settings', () => {
        beforeEach(() => {
          mockGetSpace.mockResolvedValueOnce({
            ...spacesGetSpaceFixtures,
            voting: undefined
          });
        });

        it('accepts a proposal with shutter privacy', () => {
          return expect(
            writer.verify(updateInputPayload(input, { privacy: 'shutter' }))
          ).resolves.toBeUndefined();
        });

        it('accepts a proposal with undefined privacy', () => {
          return expect(
            writer.verify(updateInputPayload(input, { privacy: undefined }))
          ).resolves.toBeUndefined();
        });

        it('accepts a proposal with no privacy', () => {
          return expect(
            writer.verify(updateInputPayload(input, { privacy: '' }))
          ).resolves.toBeUndefined();
        });
      });

      describe('when the space is using NO privacy', () => {
        beforeEach(() => {
          mockGetSpace.mockResolvedValueOnce({
            ...spacesGetSpaceFixtures,
            voting: { privacy: '' }
          });
        });

        it('rejects a proposal with shutter privacy', () => {
          return expect(
            writer.verify(updateInputPayload(input, { privacy: 'shutter' }))
          ).rejects.toMatch('not allowed to set privacy');
        });

        it('accepts a proposal with undefined privacy', () => {
          return expect(
            writer.verify(updateInputPayload(input, { privacy: undefined }))
          ).resolves.toBeUndefined();
        });

        it('accepts a proposal with no privacy', () => {
          return expect(
            writer.verify(updateInputPayload(input, { privacy: '' }))
          ).resolves.toBeUndefined();
        });
      });

      describe('when the space is using SHUTTER privacy', () => {
        beforeEach(() => {
          mockGetSpace.mockResolvedValueOnce({
            ...spacesGetSpaceFixtures,
            voting: { privacy: 'shutter' }
          });
        });

        it('accepts a proposal with shutter privacy', () => {
          return expect(
            writer.verify(updateInputPayload(input, { privacy: 'shutter' }))
          ).resolves.toBeUndefined();
        });

        it('accepts a proposal with undefined privacy', () => {
          return expect(
            writer.verify(updateInputPayload(input, { privacy: undefined }))
          ).resolves.toBeUndefined();
        });

        it('rejects a proposal with privacy empty string', async () => {
          expect.assertions(1);
          await expect(
            writer.verify(updateInputPayload(input, { privacy: '' }))
          ).rejects.toMatch('not allowed to set privacy');
        });
      });

      describe('when the space is using VOCDONI privacy', () => {
        beforeEach(() => {
          mockGetSpace.mockResolvedValueOnce({
            ...spacesGetSpaceFixtures,
            voting: { privacy: 'vocdoni' }
          });
        });

        it('accepts a proposal with vocdoni privacy', () => {
          return expect(
            writer.verify(updateInputPayload(input, { privacy: 'vocdoni' }))
          ).resolves.toBeUndefined();
        });

        it('accepts a proposal with undefined privacy', () => {
          return expect(
            writer.verify(updateInputPayload(input, { privacy: undefined }))
          ).resolves.toBeUndefined();
        });

        it('rejects a proposal with shutter privacy', async () => {
          expect.assertions(1);
          await expect(
            writer.verify(updateInputPayload(input, { privacy: 'shutter' }))
          ).rejects.toMatch('not allowed to set privacy');
        });

        it('rejects a proposal with privacy empty string', async () => {
          expect.assertions(1);
          await expect(
            writer.verify(updateInputPayload(input, { privacy: '' }))
          ).rejects.toMatch('not allowed to set privacy');
        });
      });
    });

    it('rejects if the snapshot is in the future', async () => {
      expect.assertions(1);
      const msg = JSON.parse(input.msg);
      msg.payload.snapshot = Number.MAX_SAFE_INTEGER;

      await expect(
        writer.verify({ ...input, msg: JSON.stringify(msg) })
      ).rejects.toMatch('invalid snapshot block');
    });

    it('rejects if the snapshot is lower than network start block', async () => {
      expect.assertions(1);
      const msg = JSON.parse(input.msg);
      msg.payload.snapshot = 1000;

      await expect(
        writer.verify({ ...input, msg: JSON.stringify(msg) })
      ).rejects.toMatch('proposal snapshot must be after network start');
    });

    it('rejects if the end period is in the past', async () => {
      expect.assertions(1);
      const msg = JSON.parse(input.msg);
      msg.payload.end = Math.floor(Date.now() / 1000) - 60 * 5;

      await expect(
        writer.verify({ ...input, msg: JSON.stringify(msg) })
      ).rejects.toMatch('proposal end date must be in the future');
    });

    it.each([
      [
        'flagged',
        LIMITS['space.flagged.proposal_limit_per_day'],
        'flagged',
        true
      ],
      [
        'verified',
        LIMITS['space.verified.proposal_limit_per_day'],
        'verified',
        true
      ],
      [
        'ecosystem',
        LIMITS['space.ecosystem.proposal_limit_per_day'],
        'id',
        ECOSYSTEM_LIST[0]
      ],
      ['turbo', LIMITS['space.turbo.proposal_limit_per_day'], 'turbo', true],
      ['normal', LIMITS['space.default.proposal_limit_per_day'], null, null]
    ])(
      'rejects if the %s space has exceeded the proposal daily post limit',
      async (category, limit, key, value) => {
        expect.assertions(3);
        mockGetProposalsCount.mockResolvedValueOnce([
          { dayCount: limit + 1, monthCount: 0, activeProposalsByAuthor: 1 }
        ]);
        const mockedSpace = { ...spacesGetSpaceFixtures };
        if (key && value) {
          mockedSpace[key] = value;
        }
        mockGetSpace.mockResolvedValueOnce(mockedSpace);

        await expect(writer.verify(input)).rejects.toMatch('limit reached');
        expect(mockGetProposalsCount).toHaveBeenCalledTimes(1);
        expect(mockGetSpace).toHaveBeenCalledTimes(1);
      }
    );

    it.each([
      [
        'flagged',
        LIMITS['space.flagged.proposal_limit_per_month'],
        'flagged',
        true
      ],
      [
        'verified',
        LIMITS['space.verified.proposal_limit_per_month'],
        'verified',
        true
      ],
      [
        'ecosystem',
        LIMITS['space.ecosystem.proposal_limit_per_month'],
        'id',
        ECOSYSTEM_LIST[0]
      ],
      ['turbo', LIMITS['space.turbo.proposal_limit_per_month'], 'turbo', true],
      ['normal', LIMITS['space.default.proposal_limit_per_month'], null, null]
    ])(
      'rejects if the %s space has exceeded the proposal monthly post limit',
      async (category, limit, key, value) => {
        expect.assertions(3);
        mockGetProposalsCount.mockResolvedValueOnce([
          { dayCount: 0, monthCount: limit + 1, activeProposalsByAuthor: 1 }
        ]);
        const mockedSpace = { ...spacesGetSpaceFixtures };
        if (key && value) {
          mockedSpace[key] = value;
        }
        mockGetSpace.mockResolvedValueOnce(mockedSpace);

        await expect(writer.verify(input)).rejects.toMatch('limit reached');
        expect(mockGetProposalsCount).toHaveBeenCalledTimes(1);
        expect(mockGetSpace).toHaveBeenCalledTimes(1);
      }
    );

    it('rejects if the user has exceed the number of proposals per space', async () => {
      expect.assertions(2);
      mockGetProposalsCount.mockResolvedValueOnce([
        {
          dayCount: 0,
          monthCount: 0,
          activeProposalsByAuthor:
            LIMITS['space.active_proposal_limit_per_author'] + 1
        }
      ]);

      await expect(writer.verify(input)).rejects.toMatch(
        'limit reached for author'
      );
      expect(mockGetProposalsCount).toHaveBeenCalledTimes(1);
    });

    it('rejects if the space limit checker fails', async () => {
      expect.assertions(2);
      const mockGetProposalsCount = jest
        .spyOn(writer, 'getProposalsCount')
        .mockImplementationOnce(() => {
          throw new Error();
        });

      await expect(writer.verify(input)).rejects.toMatch(
        'failed to check proposals limit'
      );
      expect(mockGetProposalsCount).toHaveBeenCalledTimes(1);
    });

    it('rejects if the space is not found', async () => {
      expect.assertions(2);
      mockGetSpace.mockResolvedValueOnce(false);

      await expect(writer.verify(input)).rejects.toMatch('unknown space');
      expect(mockGetSpace).toHaveBeenCalledTimes(1);
    });

    it('rejects if space validation fails', async () => {
      expect.assertions(2);
      mockValidateSpaceSettings.mockRejectedValueOnce(
        'space validation failed'
      );
      mockGetSpace.mockResolvedValueOnce({
        ...spacesGetSpaceFixtures
      });

      await expect(writer.verify(input)).rejects.toMatch(
        'invalid space settings: space validation failed'
      );
      expect(mockGetSpace).toHaveBeenCalledTimes(1);
    });

    describe('when only members can propose', () => {
      it('rejects if the submitter is not a space member', async () => {
        expect.assertions(2);
        mockGetSpace.mockResolvedValueOnce({
          ...spacesGetSpaceFixtures,
          filters: { onlyMembers: true }
        });

        await expect(writer.verify(input)).rejects.toMatch('authors');
        expect(mockGetSpace).toHaveBeenCalledTimes(1);
      });
    });

    it('verifies a valid input', async () => {
      expect.assertions(1);
      await expect(writer.verify(input)).resolves.toBeUndefined();
    });
  });
});
