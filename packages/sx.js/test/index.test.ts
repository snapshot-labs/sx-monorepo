import { propose, vote } from '../src';

describe('', () => {
  it('propose()', async () => {
    const response = await propose();
    expect(response).not.toThrow();
  }, 24e3);

  it('vote()', async () => {
    const response = await vote();
    expect(response).not.toThrow();
  }, 24e3);
});
