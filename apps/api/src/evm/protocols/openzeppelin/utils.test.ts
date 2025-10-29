import { describe, expect, it } from 'vitest';
import {
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
