import { constants } from 'starknet';
import z from 'zod';

const HEX = /^(?:0x)?[0-9a-fA-F]{1,64}$/;

function isHexWithinBound(value: string, bound: bigint) {
  return HEX.test(value) && BigInt(`0x${value.replace(/^0x/, '')}`) < bound;
}

const feltSchema = z
  .string()
  .refine(value => isHexWithinBound(value, constants.PRIME), 'Invalid felt');

const addressSchema = z
  .string()
  .refine(
    value => value.startsWith('0x') && isHexWithinBound(value, 2n ** 251n),
    'Invalid address'
  );

export const registeredTransactionSchema = z.object({
  type: z.enum(['Propose', 'UpdateProposal', 'Vote']),
  sender: feltSchema,
  hash: feltSchema,
  payload: z
    .object({
      space: addressSchema,
      authenticator: addressSchema
    })
    .passthrough()
});
