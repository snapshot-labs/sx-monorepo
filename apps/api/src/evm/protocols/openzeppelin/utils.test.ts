import { describe, expect, it } from 'vitest';
import {
  computeTimelockOperationIds,
  convertChoice,
  getProposalBody,
  getProposalTitle,
  getRawProposalTitle
} from './utils';

describe('getRawProposalTitle', () => {
  it('should return null for "" body', () => {
    expect(getRawProposalTitle('""')).toBeNull();
  });

  it('should return raw first line', () => {
    expect(getRawProposalTitle('## Some title')).toBe('## Some title');
    expect(getRawProposalTitle('## Some title\nNext line')).toBe(
      '## Some title'
    );
  });
});

describe('getProposalTitle', () => {
  it('should return null for "" body', () => {
    expect(getProposalTitle('""')).toBeNull();
  });

  it('should return first line without markdown heading syntax', () => {
    expect(getProposalTitle('## Some title\nNext line')).toBe('Some title');
  });
});

describe('getProposalBody', () => {
  it('should return whole body if body is not detected', () => {
    expect(getProposalBody('""')).toBe('""');
  });

  it('should return content after title', () => {
    expect(getProposalBody('## Some title\nNext line\nAnother')).toBe(
      'Next line\nAnother'
    );
  });
});

describe('convertChoice', () => {
  it.for([
    [0, 2],
    [1, 1],
    [2, 3],
    [3, null],
    [-1, null]
  ] as const)('should convert %i to %j', ([rawChoice, expected]) => {
    expect(convertChoice(rawChoice)).toBe(expected);
  });
});

describe('computeTimelockOperationIds', () => {
  // Fixture: Arbitrum Foundation Core Governor (OZ v4, salt = descriptionHash).
  // ProposalCreated: https://arbiscan.io/tx/0x6962dd50b6e56e56c3a75633567e5b3a6b5fe93c978beb1eb038df20860f62dc
  // CallExecuted:  https://arbiscan.io/tx/0xb59f0a457418c272df7b81f7015b29f9f2cc713298e278577c6f1031eb511853
  const v4Fixture = {
    governor: '0xf07DeD9dC292157749B6Fd268E37DF6EA38395B9' as const,
    targets: ['0x0000000000000000000000000000000000000064'] as const,
    values: [0n],
    calldatas: [
      '0x928c169a000000000000000000000000e6841d92b0c345144506576ec13ecf5103ac7f49000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000003248f2a0bb000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000000000000000000000000000000da537a8813f50264f91f9a2f8abcd15373495e15278e7fe7cfa90e0892f8c300000000000000000000000000000000000000000000000000000000000003f4800000000000000000000000000000000000000000000000000000000000000001000000000000000000000000a723c008e76e379c55599d2e4d93879beafda79c000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000001800000000000000000000000004dbd4fc535ac27206064b68ffcf827b0a60bab3f000000000000000000000000cf57572261c7c2bcf21ffd220ea7d1a27d40a82700000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000841cff79cd0000000000000000000000005b947d8bf197467be7ef381b7cafee0a7b35737a00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000004b147f40c000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'
    ] as const,
    descriptionHash:
      '0x082b2ee1b8009f5206c876176497535acd2b63812224f2d7175442be580e3a8e' as const,
    expectedId:
      '0xa2f9b43f8745f354d88ea380c68d72ac76c8ee59aa20cfa567d51e53b65b179b'
  };

  // Fixture: test governor on Sepolia (OZ v5, salt = bytes32(bytes20(governor)) ^ descriptionHash).
  // ProposalCreated: https://sepolia.etherscan.io/tx/0x806ea125e865d1b00379a76ecf8db5a6b141481932e6ce223ffaa997b457d874
  // CallExecuted: https://sepolia.etherscan.io/tx/0x3a533520d34c6fc2802d3ac0600a6c9c59aee87a00a4d9502eca679a46e9f8b1
  const v5Fixture = {
    governor: '0xb314fac800bd0f5646e1a230b212ed88936648e0' as const,
    targets: [
      '0x556B14CbdA79A36dC33FcD461a04A5BCb5dC2A70',
      '0xB314FAC800bD0F5646e1a230b212Ed88936648e0'
    ] as const,
    values: [1000000000000000n, 0n],
    calldatas: [
      '0x',
      '0x79051887000000000000000000000000000000000000000000000000000000000000000f'
    ] as const,
    descriptionHash:
      '0xea59b51ac1e26e02bf9efb5071d13d84010d937c738baa4ed4e4c59b0715c20b' as const,
    expectedId:
      '0xfb85faccde459bd517441d68df19438083d0df3fa984c28c9a2f6548fb29593d'
  };

  it('matches on-chain id for a pre-v5 OZ governor (salt = descriptionHash)', () => {
    const [legacyId, currentId] = computeTimelockOperationIds(v4Fixture);

    expect(legacyId).toBe(v4Fixture.expectedId);
    expect(currentId).not.toBe(v4Fixture.expectedId);
  });

  it('matches on-chain id for a v5+ OZ governor (salt XOR governor address)', () => {
    const [legacyId, currentId] = computeTimelockOperationIds(v5Fixture);

    expect(currentId).toBe(v5Fixture.expectedId);
    expect(legacyId).not.toBe(v5Fixture.expectedId);
  });

  it('v5 id depends on the governor address, v4 id does not', () => {
    const different = {
      ...v5Fixture,
      governor: '0x0000000000000000000000000000000000000001' as const
    };
    const [legacyIdA, currentIdA] = computeTimelockOperationIds(v5Fixture);
    const [legacyIdB, currentIdB] = computeTimelockOperationIds(different);

    expect(legacyIdA).toBe(legacyIdB);
    expect(currentIdA).not.toBe(currentIdB);
  });
});
