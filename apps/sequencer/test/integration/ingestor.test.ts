import cloneDeep from 'lodash/cloneDeep';
import omit from 'lodash/omit';
import db, { sequencerDB } from '../../src/helpers/mysql';
import relayer from '../../src/helpers/relayer';
import ingestor from '../../src/ingestor';
import proposalInput from '../fixtures/ingestor-payload/proposal.json';
import voteInput from '../fixtures/ingestor-payload/vote.json';
import { spacesGetSpaceFixtures } from '../fixtures/space';

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

jest.mock('../../src/helpers/options', () => {
  const originalModule = jest.requireActual('../../src/helpers/options');

  return {
    __esModule: true,
    ...originalModule,
    getList: () => {
      return ECOSYSTEM_LIST;
    },
    getLimit: async (key: string) => {
      return LIMITS[key];
    },
    getLimits: () => {
      return LIMITS;
    },
    getSpaceType: () => {
      return 'default';
    }
  };
});

jest.mock('../../src/helpers/moderation', () => {
  const originalModule = jest.requireActual('../../src/helpers/moderation');

  return {
    __esModule: true,
    ...originalModule,
    // sha256 of 1.2.3.4
    flaggedIps: [
      '6694f83c9f476da31f5df6bcc520034e7e57d421d247b9d34f49edbfc84a764c'
    ]
  };
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mockGetSpace = jest.fn((_): any => {
  return spacesGetSpaceFixtures;
});
jest.mock('../../src/helpers/actions', () => {
  const originalModule = jest.requireActual('../../src/helpers/actions');

  return {
    __esModule: true,
    ...originalModule,
    getSpace: (id: string) => mockGetSpace(id),
    getPremiumNetworkIds: () => ['1', '10', '137', '250']
  };
});

const mockSnapshotUtilsVerify = jest.fn((): any => {
  return true;
});
jest.mock('@snapshot-labs/snapshot.js', () => {
  const originalModule = jest.requireActual('@snapshot-labs/snapshot.js');

  return {
    ...originalModule,
    utils: {
      ...originalModule.utils,
      verify: () => mockSnapshotUtilsVerify()
    }
  };
});

const mockPin = jest.fn(
  async (payload: any, originalFn: (payload: any) => any): Promise<any> => {
    return originalFn(payload);
  }
);
jest.mock('@snapshot-labs/pineapple', () => {
  const originalModule = jest.requireActual('@snapshot-labs/pineapple');

  return {
    ...originalModule,
    pin: (payload: any) => mockPin(payload, originalModule.pin)
  };
});

jest.mock('../../src/helpers/strategies', () => ({
  getStrategies: jest.fn(() => ({
    'erc20-balance-of': {
      id: 'erc20-balance-of',
      override: false,
      disabled: false
    },
    'contract-call': { id: 'contract-call', override: true, disabled: false },
    delegation: { id: 'delegation', override: false, disabled: false },
    whitelist: { id: 'whitelist', override: false, disabled: false }
  })),
  initialize: jest.fn().mockResolvedValue(undefined),
  run: jest.fn(),
  stop: jest.fn()
}));

const proposalRequest = {
  headers: { 'x-real-ip': '1.1.1.1' },
  body: proposalInput
};

const voteRequest = {
  headers: { 'x-real-ip': '1.1.1.1' },
  body: voteInput
};

function cloneWithNewMessage(data: Record<string, any>) {
  const clonedRequest = cloneDeep(proposalRequest);
  clonedRequest.body.data.message = {
    ...clonedRequest.body.data.message,
    ...data
  };

  return clonedRequest;
}

describe('ingestor', () => {
  beforeAll(async () => {
    proposalInput.data.message.timestamp = Math.floor(Date.now() / 1e3) - 60;
    proposalInput.data.message.end = Math.floor(Date.now() / 1e3) + 60;
    voteInput.data.message.timestamp = Math.floor(Date.now() / 1e3) - 60;
  });

  afterEach(async () => {
    await db.queryAsync('DELETE FROM snapshot_sequencer_test.messages');
    await db.queryAsync('DELETE FROM snapshot_sequencer_test.proposals');
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await db.queryAsync('DELETE FROM snapshot_sequencer_test.proposals;');
    await db.queryAsync('DELETE FROM snapshot_sequencer_test.messages;');
    await db.endAsync();
    await sequencerDB.endAsync();
  });

  it('rejects when the submitter IP is banned', async () => {
    const ip = '1.2.3.4';

    await expect(ingestor({ headers: { 'x-real-ip': ip } })).rejects.toMatch(
      'unauthorized'
    );
  });

  describe('when the schema is invalid', () => {
    const fixtures = [
      ['is missing', null],
      ['is empty', {}],
      ['missing a required key', omit(proposalInput, 'data')],
      ['contains an extra unauthorized key', { ...proposalInput, test: 'test' }]
    ];

    it.each(fixtures)(
      'rejects when the proposalInput %s',
      async (title: string, body: any) => {
        await expect(ingestor({ ...proposalRequest, body })).rejects.toMatch(
          'envelop'
        );
      }
    );
  });

  it('rejects when the body is too large', async () => {
    const invalidRequest = cloneWithNewMessage({
      body: ' - - - '.repeat(50000)
    });

    await expect(ingestor(invalidRequest)).rejects.toMatch('large');
  });

  describe('when the timestamp is invalid', () => {
    const proposalInput = [
      ['future', Date.now() + 10000],
      ['past', Date.now() - 10000]
    ];

    it.each(proposalInput)(
      'rejects timestamp too far in the %s',
      async (title: any, timestamp: any) => {
        const invalidRequest = cloneWithNewMessage({ timestamp });

        await expect(ingestor(invalidRequest)).rejects.toMatch('timestamp');
      }
    );
  });

  it('rejects when the domain is not matching', async () => {
    const invalidRequest = cloneDeep(proposalRequest);
    invalidRequest.body.data.domain = { name: 'snapshot', version: '99.99.99' };

    await expect(ingestor(invalidRequest)).rejects.toMatch('domain');
  });

  it('rejects when the type does not exist', async () => {
    const invalidRequest = cloneDeep(proposalRequest);
    invalidRequest.body.data.types.Proposal.push({
      name: 'test',
      type: 'number'
    });

    await expect(ingestor(invalidRequest)).rejects.toMatch('type');
  });

  it('rejects when the space is not found', async () => {
    mockGetSpace.mockReturnValueOnce(null);

    await expect(ingestor(proposalRequest)).rejects.toMatch('space');
    expect(mockGetSpace).toHaveBeenCalledTimes(1);
  });

  it('rejects when the proposal ID contains whitespace', async () => {
    const invalidRequest = cloneDeep(proposalRequest);
    invalidRequest.body.data.message.proposal = '0x ';

    await expect(ingestor(invalidRequest)).rejects.toMatch('whitespace');
  });

  describe('when the message creator is not the sender', () => {
    it.todo('rejects when alias is not available for the type');
    it.todo('rejects when alias is not enabled');
    it.todo('rejects when the submitted is not an allowed alias');
  });

  it('rejects when the signature is not valid', async () => {
    mockSnapshotUtilsVerify.mockReturnValueOnce(false);

    await expect(ingestor(proposalRequest)).rejects.toMatch('signature');
  });

  it('rejects when the metadata is too large', async () => {
    const invalidRequest = cloneDeep(voteRequest);
    invalidRequest.body.data.message.metadata = JSON.stringify({
      reason: ' - '.repeat(5000)
    });

    await expect(ingestor(invalidRequest)).rejects.toMatch('large');
  });

  it('rejects when IPFS pinning fail', async () => {
    mockPin.mockImplementationOnce(() => {
      return Promise.reject('');
    });

    await expect(ingestor(proposalRequest)).rejects.toMatch('pin');
    expect(mockPin).toHaveBeenCalledTimes(1);
  });

  it('rejects on action replay', async () => {
    expect.assertions(2);
    await expect(ingestor(proposalRequest)).resolves.toHaveProperty('id');
    await expect(ingestor(proposalRequest)).rejects.toEqual(
      'duplicate message'
    );
  });

  it('rejects on duplicate entry', async () => {
    expect.assertions(2);
    await expect(ingestor(proposalRequest)).resolves.toHaveProperty('id');
    await db.queryAsync('DELETE from snapshot_sequencer_test.messages');
    await expect(ingestor(proposalRequest)).rejects.toEqual(
      'duplicate message'
    );
  });

  it('rejects when the ENS name is not valid', () => {
    const invalidRequest = cloneDeep(voteRequest);
    // Special hidden char after the k
    invalidRequest.body.data.message.space = 'elonmusk‍‍.eth';
    expect(ingestor(invalidRequest)).rejects.toContain('Invalid space id');
  });

  describe('on a valid transaction', () => {
    beforeEach(async () => {
      await db.queryAsync('DELETE from snapshot_sequencer_test.proposals');
    });

    it('returns a payload', async () => {
      const result = await ingestor(proposalRequest);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('ipfs');
      expect(result).toHaveProperty('relayer');
      expect(result.relayer.address).toEqual(relayer.address);
      expect(result.relayer).toHaveProperty('receipt');
    });

    it('saves the proposal in the DB', async () => {
      const typeResult = await ingestor(proposalRequest);
      const dbResult = await db.queryAsync(
        `SELECT * from proposals WHERE id = ? LIMIT 1`,
        typeResult.id
      );

      expect(dbResult.length).toBe(1);
    });

    it('stores the author normalized to lowercase for a mixed-case EVM submission', async () => {
      // The ingestor must normalize the EVM signer address once, so that
      // writers store a canonical lowercase address regardless of how the
      // client cased it (signature verification is case-insensitive).
      const mixedCaseAddress = '0x91FD2c8d24767db4Ece7069AA27832ffaf8590f3';
      expect(mixedCaseAddress).not.toBe(mixedCaseAddress.toLowerCase());

      const request = cloneDeep(proposalRequest);
      request.body.address = mixedCaseAddress;
      request.body.data.message.from = mixedCaseAddress;

      const typeResult = await ingestor(request);
      const dbResult = await db.queryAsync(
        `SELECT author from proposals WHERE id = ? LIMIT 1`,
        typeResult.id
      );

      expect(dbResult.length).toBe(1);
      expect(dbResult[0].author).toBe(mixedCaseAddress.toLowerCase());
    });

    ['vote', 'follow', 'unfollow', 'subscribe', 'unsubscribe'].forEach(type => {
      it.todo(`updates/saves the ${type} in the DB`);
    });
  });
});
