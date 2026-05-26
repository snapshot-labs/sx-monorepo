const mockStrategies: Record<string, any> = {
  'erc20-balance-of': {
    id: 'erc20-balance-of',
    disabled: false,
    override: false
  },
  whitelist: { id: 'whitelist', disabled: false, override: false },
  ticket: { id: 'ticket', disabled: false, override: false }
};

jest.mock('../../../src/helpers/strategies', () => ({
  getStrategies: jest.fn(() => mockStrategies)
}));

// Mock the log module to avoid any issues
jest.mock('../../../src/helpers/log', () => ({
  warn: jest.fn()
}));

import { validateSpaceSettings } from '../../../src/helpers/spaceValidation';

describe('helpers/spaceValidation', () => {
  describe('validateSpaceSettings()', () => {
    beforeEach(() => {
      jest.clearAllMocks();

      // Reset mockStrategies to original state
      Object.keys(mockStrategies).forEach(key => delete mockStrategies[key]);
      Object.assign(mockStrategies, {
        'erc20-balance-of': {
          id: 'erc20-balance-of',
          disabled: false,
          override: false
        },
        whitelist: { id: 'whitelist', disabled: false, override: false },
        ticket: { id: 'ticket', disabled: false, override: false }
      });
    });

    const createMockSpace = (overrides = {}) => ({
      id: 'test-space.eth',
      name: 'Test Space',
      network: '1',
      symbol: 'TEST',
      strategies: [
        { name: 'erc20-balance-of', params: {} },
        { name: 'whitelist', params: {} }
      ],
      validation: { name: 'basic' },
      voteValidation: { name: 'basic', params: { minScore: 1 } },
      ...overrides
    });

    describe('strategy validation', () => {
      it('should pass when all strategies are valid and enabled', async () => {
        const space = createMockSpace();
        await expect(
          validateSpaceSettings(space, 'mainnet')
        ).resolves.toBeUndefined();
      });

      it('should reject when strategy does not exist', async () => {
        // Remove whitelist strategy from mock
        delete mockStrategies['whitelist'];

        const space = createMockSpace();
        await expect(validateSpaceSettings(space, 'mainnet')).rejects.toBe(
          "strategy 'whitelist' is not a valid strategy"
        );
      });

      it('should reject when strategy is disabled', async () => {
        mockStrategies['whitelist'] = {
          id: 'whitelist',
          disabled: true,
          override: false
        };

        const space = createMockSpace();
        await expect(validateSpaceSettings(space, 'mainnet')).rejects.toBe(
          "strategy 'whitelist' is not available anymore"
        );
      });

      it('should reject first invalid strategy when multiple are invalid', async () => {
        // Keep only erc20-balance-of strategy
        Object.keys(mockStrategies).forEach(key => {
          if (key !== 'erc20-balance-of') delete mockStrategies[key];
        });

        const space = createMockSpace({
          strategies: [
            { name: 'invalid-strategy-1', params: {} },
            { name: 'invalid-strategy-2', params: {} }
          ]
        });

        await expect(validateSpaceSettings(space, 'mainnet')).rejects.toBe(
          "strategy 'invalid-strategy-1' is not a valid strategy"
        );
      });

      it('should reject first disabled strategy when multiple are disabled', async () => {
        mockStrategies['strategy1'] = {
          id: 'strategy1',
          disabled: true,
          override: false
        };
        mockStrategies['strategy2'] = {
          id: 'strategy2',
          disabled: true,
          override: false
        };

        const space = createMockSpace({
          strategies: [
            { name: 'strategy1', params: {} },
            { name: 'strategy2', params: {} }
          ]
        });

        await expect(validateSpaceSettings(space, 'mainnet')).rejects.toBe(
          "strategy 'strategy1' is not available anymore"
        );
      });

      it('should reject override strategy for non-turbo space', async () => {
        mockStrategies['override-strategy'] = {
          id: 'override-strategy',
          disabled: false,
          override: true
        };

        const space = createMockSpace({
          strategies: [{ name: 'override-strategy', params: {} }]
        });

        await expect(validateSpaceSettings(space, 'mainnet')).rejects.toBe(
          "strategy 'override-strategy' is only available for pro spaces"
        );
      });

      it('should allow override strategy for turbo space', async () => {
        mockStrategies['override-strategy'] = {
          id: 'override-strategy',
          disabled: false,
          override: true
        };

        const space = createMockSpace({
          turbo: true,
          strategies: [{ name: 'override-strategy', params: {} }]
        });

        await expect(
          validateSpaceSettings(space, 'mainnet')
        ).resolves.toBeUndefined();
      });
    });

    describe('other validations', () => {
      it('should reject deleted spaces', async () => {
        const space = createMockSpace({ deleted: true });
        await expect(validateSpaceSettings(space, 'mainnet')).rejects.toBe(
          'space deleted, contact admin'
        );
      });

      it('should reject space that is its own parent', async () => {
        const space = createMockSpace({
          id: 'test-space.eth',
          parent: 'test-space.eth'
        });

        await expect(validateSpaceSettings(space, 'mainnet')).rejects.toBe(
          'space cannot be its own parent'
        );
      });

      it('should reject space that includes itself in children', async () => {
        const space = createMockSpace({
          id: 'test-space.eth',
          children: ['other-space.eth', 'test-space.eth']
        });

        await expect(validateSpaceSettings(space, 'mainnet')).rejects.toBe(
          'space cannot be its own child'
        );
      });
    });

    describe('mainnet environment', () => {
      it('should reject ticket strategy without vote validation on mainnet', async () => {
        const space = createMockSpace({
          strategies: [{ name: 'ticket', params: {} }],
          voteValidation: undefined
        });

        await expect(validateSpaceSettings(space, 'mainnet')).rejects.toBe(
          'space with ticket requires voting validation'
        );
      });

      it('should reject ticket strategy with "any" vote validation on mainnet', async () => {
        const space = createMockSpace({
          strategies: [{ name: 'ticket', params: {} }],
          voteValidation: { name: 'any' }
        });

        await expect(validateSpaceSettings(space, 'mainnet')).rejects.toBe(
          'space with ticket requires voting validation'
        );
      });

      it('should allow ticket strategy with proper vote validation on mainnet', async () => {
        const space = createMockSpace({
          strategies: [{ name: 'ticket', params: {} }],
          voteValidation: { name: 'basic', params: { minScore: 1 } }
        });

        await expect(
          validateSpaceSettings(space, 'mainnet')
        ).resolves.toBeUndefined();
      });
    });

    describe('testnet environment', () => {
      it('should allow spaces without proposal validation in testnet', async () => {
        const space = createMockSpace({
          validation: { name: 'any' },
          strategies: [{ name: 'erc20-balance-of', params: {} }]
        });

        await expect(
          validateSpaceSettings(space, 'testnet')
        ).resolves.toBeUndefined();
      });

      it('should allow ticket strategy without vote validation in testnet', async () => {
        const space = createMockSpace({
          strategies: [{ name: 'ticket', params: {} }],
          voteValidation: undefined
        });

        await expect(
          validateSpaceSettings(space, 'testnet')
        ).resolves.toBeUndefined();
      });
    });
  });
});
