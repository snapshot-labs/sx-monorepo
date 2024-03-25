import { randomBytes } from '@ethersproject/random';
import { BigNumber } from '@ethersproject/bignumber';
import { arrayify, hexlify } from '@ethersproject/bytes';
import { toUtf8Bytes, formatBytes32String } from '@ethersproject/strings';
import { init, encrypt } from '@shutter-network/shutter-crypto';
import type { Privacy } from '../../types';

const SHUTTER_EON_PUBKEY =
  '0x0e6493bbb4ee8b19aa9b70367685049ff01dc9382c46aed83f8bc07d2a5ba3e6030bd83b942c1fd3dff5b79bef3b40bf6b666e51e7f0be14ed62daaffad47435265f5c9403b1a801921981f7d8659a9bd91fe92fb1cf9afdb16178a532adfaf51a237103874bb03afafe9cab2118dae1be5f08a0a28bf488c1581e9db4bc23ca';

export async function encryptChoices(
  privacy: Privacy,
  proposalId: string,
  choice: string
): Promise<string> {
  if (privacy === 'shutter') {
    return encryptShutterChoice(choice, proposalId);
  }

  throw new Error('Encryption type not supported');
}

async function encryptShutterChoice(choice: string, id: string): Promise<string> {
  const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
  const shutterWasm = isBrowser
    ? (await import('@shutter-network/shutter-crypto/dist/shutter-crypto.wasm?url')).default
    : undefined;

  if (window) await init(shutterWasm);

  const bytesChoice = toUtf8Bytes(choice);
  const message = arrayify(bytesChoice);
  const eonPublicKey = arrayify(SHUTTER_EON_PUBKEY);

  const is32ByteString = id.startsWith('0x');
  const proposalId = arrayify(is32ByteString ? id : formatBytes32String(id));

  const sigma = arrayify(BigNumber.from(randomBytes(32)));

  const encryptedMessage = await encrypt(message, eonPublicKey, proposalId, sigma);

  return hexlify(encryptedMessage) ?? null;
}
