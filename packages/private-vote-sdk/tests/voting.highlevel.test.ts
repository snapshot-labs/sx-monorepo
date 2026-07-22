import {
  G2Point,
  buildBallot,
  initCurves,
  schnorrKeygen,
} from '../src';

beforeAll(async () => {
  await initCurves();
});

describe('high-level ballot wrapper', () => {
  it('rejects identity mpk before producing vote-revealing ciphertexts', () => {
    const { sk, vk } = schnorrKeygen();

    expect(() =>
      buildBallot({
        mpk: G2Point.identity(),
        electionId: new Uint8Array(32).fill(0xe1),
        pseudonym: new Uint8Array(32).fill(0xa1),
        sk,
        vk,
        votes: [1n],
        params: {
          numCandidates: 1,
          budget: 1,
          mode: 'exact',
          variant: 'A',
        },
        wrAttestation: new Uint8Array([0x01]),
      }),
    ).toThrow(/mpk is the identity/);
  });
});
