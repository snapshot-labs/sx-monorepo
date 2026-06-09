// Mock validateSpaceSettings function
jest.mock('../../../src/helpers/spaceValidation', () => ({
  validateSpaceSettings: jest.fn()
}));

import { verify } from '../../../src/writer/settings';
import { spacesGetSpaceFixtures } from '../../fixtures/space';
import input from '../../fixtures/writer-payload/space.json';

function editedInput(payload = {}) {
  const result = { ...input, msg: JSON.parse(input.msg) };
  result.msg.payload = { ...result.msg.payload, ...payload };

  return { ...result, msg: JSON.stringify(result.msg) };
}

function randomStrategies(count = 1) {
  return Array(count)
    .fill(0)
    .map(() => ({
      name: 'whitelist',
      params: {
        addresses: [`0x${Math.floor(Math.random() * 1000)}`]
      }
    }));
}

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
  'space.turbo.strategies_limit': 10,
  'space.verified.proposal_limit_per_day': 20,
  'space.verified.proposal_limit_per_month': 100,
  'space.verified.choices_limit': 20,
  'space.verified.body_length': 10000,
  'space.verified.strategies_limit': 6,
  'user.default.follow.limit': 25
};
const ECOSYSTEM_LIST = ['test.eth', 'snapshot.eth'];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mockGetSpaceType = jest.fn(async (_space: any): Promise<string> => {
  return 'default';
});
jest.mock('../../../src/helpers/options', () => {
  const originalModule = jest.requireActual('../../../src/helpers/options');

  return {
    __esModule: true,
    ...originalModule,
    getList: () => {
      return ECOSYSTEM_LIST;
    },
    getLimit: async (key: string) => {
      return LIMITS[key];
    },
    getSpaceType: (space: any) => {
      return mockGetSpaceType(space);
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

const mockGetSpaceController = jest.fn((): any => {
  return '0xF296178d553C8Ec21A2fBD2c5dDa8CA9ac905A00';
});
jest.mock('@snapshot-labs/snapshot.js', () => {
  const originalModule = jest.requireActual('@snapshot-labs/snapshot.js');

  return {
    ...originalModule,
    utils: {
      ...originalModule.utils,
      getSpaceController: () => mockGetSpaceController()
    }
  };
});

// Get the mocked function after the mock is created
const { validateSpaceSettings: mockValidateSpaceSettings } = jest.requireMock(
  '../../../src/helpers/spaceValidation'
);

describe('writer/settings', () => {
  describe('verify()', () => {
    beforeEach(() => {
      // Reset all mocks
      jest.clearAllMocks();
      // Default validateSpaceSettings to resolve (success)
      mockValidateSpaceSettings.mockResolvedValue(undefined);
    });

    describe('on invalid input', () => {
      it.todo('rejects if the schema is invalid');

      it('rejects if validateSpaceSettings fails', async () => {
        mockValidateSpaceSettings.mockRejectedValue('validation error');
        return expect(verify(input)).rejects.toBe('validation error');
      });

      it('rejects if space id is too long', async () => {
        const longId = 'a'.repeat(65);
        const longInput = { ...input, msg: JSON.parse(input.msg) };
        longInput.msg.space = longId;
        const inputWithLongId = {
          ...input,
          msg: JSON.stringify(longInput.msg)
        };

        return expect(verify(inputWithLongId)).rejects.toBe('id too long');
      });

      const maxStrategiesForNormalSpace =
        LIMITS['space.default.strategies_limit'];
      const maxStrategiesForTurboSpace = LIMITS['space.turbo.strategies_limit'];
      it(`rejects if passing more than ${maxStrategiesForNormalSpace} strategies for normal space`, async () => {
        return expect(
          verify(
            editedInput({
              strategies: randomStrategies(maxStrategiesForNormalSpace + 2)
            })
          )
        ).rejects.toContain(
          `max number of strategies is ${maxStrategiesForNormalSpace}`
        );
      });

      it(`rejects if passing more than ${maxStrategiesForTurboSpace} strategies for turbo space`, async () => {
        mockGetSpaceType.mockResolvedValueOnce('turbo');
        mockGetSpace.mockResolvedValueOnce({
          ...spacesGetSpaceFixtures,
          turbo: true
        });
        return expect(
          verify(
            editedInput({
              strategies: randomStrategies(maxStrategiesForTurboSpace + 2)
            })
          )
        ).rejects.toContain(
          `max number of strategies is ${maxStrategiesForTurboSpace}`
        );
      });

      it.todo('rejects if the submitter does not have permission');
      it.todo(
        'rejects if the submitter does not have permission to change admin'
      );

      describe('when the space has an existing custom domain', () => {
        it('accepts a new domain for non-turbo spaces', () => {
          mockGetSpace.mockResolvedValueOnce({
            ...spacesGetSpaceFixtures,
            turbo: false,
            domain: 'test.com'
          });
          return expect(
            verify(
              editedInput({
                domain: 'test2.com'
              })
            )
          ).resolves.toBeUndefined();
        });

        it('accepts a new domain for turbo spaces', () => {
          mockGetSpace.mockResolvedValueOnce({
            ...spacesGetSpaceFixtures,
            turbo: true,
            domain: 'test.com'
          });
          return expect(
            verify(
              editedInput({
                domain: 'test2.com'
              })
            )
          ).resolves.toBeUndefined();
        });
      });

      describe('when the space does not have an existing custom domain', () => {
        it('rejects a new domain for non-turbo spaces', () => {
          mockGetSpace.mockResolvedValueOnce({
            ...spacesGetSpaceFixtures,
            turbo: false,
            domain: undefined
          });
          return expect(
            verify(
              editedInput({
                domain: 'test2.com'
              })
            )
          ).rejects.toContain('domain is a turbo feature only');
        });

        it('accepts a new domain for turbo spaces', () => {
          mockGetSpace.mockResolvedValueOnce({
            ...spacesGetSpaceFixtures,
            turbo: true,
            domain: undefined
          });
          return expect(
            verify(
              editedInput({
                domain: 'test2.com'
              })
            )
          ).resolves.toBeUndefined();
        });
      });
    });

    describe('on valid data', () => {
      it('accepts the controller even when its address casing differs from the signed message', async () => {
        // getSpaceController returns a checksummed address; the signed message may be lowercased.
        const lowercasedInput = { ...input, address: input.address.toLowerCase() };

        return expect(verify(lowercasedInput)).resolves.toBeUndefined();
      });

      it('calls validateSpaceSettings with correct parameters', async () => {
        await verify(input);

        expect(mockValidateSpaceSettings).toHaveBeenCalledWith({
          ...JSON.parse(input.msg).payload,
          id: JSON.parse(input.msg).space,
          deleted: spacesGetSpaceFixtures.deleted,
          turbo: spacesGetSpaceFixtures.turbo
        });
      });

      it('passes when validateSpaceSettings succeeds and strategy count is valid', async () => {
        const result = await verify(
          editedInput({
            strategies: randomStrategies(5)
          })
        );

        expect(result).toBeUndefined();
        expect(mockValidateSpaceSettings).toHaveBeenCalled();
      });

      describe('with correct number of strategies for normal spaces', () => {
        it('returns a Promise resolve', async () => {
          return expect(
            verify(
              editedInput({
                strategies: randomStrategies(8)
              })
            )
          ).resolves.toBe(undefined);
        });
      });

      describe('with correct number of strategies for turbo spaces', () => {
        it('returns a Promise resolve', async () => {
          mockGetSpaceType.mockResolvedValueOnce('turbo');
          mockGetSpace.mockResolvedValueOnce({
            ...spacesGetSpaceFixtures,
            turbo: true
          });
          return expect(
            verify(
              editedInput({
                strategies: randomStrategies(10)
              })
            )
          ).resolves.toBe(undefined);
        });
      });
    });
  });

  describe('action()', () => {
    describe('when the space already exist', () => {
      it.todo('updates the space');
    });

    describe('when the space does not exist', () => {
      it.todo('creates the space');
    });
  });
});
