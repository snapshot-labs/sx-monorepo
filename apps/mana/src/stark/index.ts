import express from 'express';
import { validateAndParseAddress } from 'starknet';
import z from 'zod';
import { getStarknetAccount } from './dependencies';
import { NETWORKS } from './networks';
import { createNetworkHandler } from './rpc';
import { indexWithAddress, rpcError } from '../utils';

const jsonRpcRequestSchema = z.object({
  id: z.any(),
  method: z.enum([
    'send',
    'execute',
    'registerTransaction',
    'registerProposal',
    'getDataByMessageHash',
    'generateMerkleTree',
    'getMerkleRoot',
    'getMerkleProof'
  ]),
  params: z.any()
});

const handlers = Object.fromEntries(
  Array.from(NETWORKS.keys()).map(chainId => [
    chainId,
    createNetworkHandler(chainId)
  ])
);

const router = express.Router();

router.post('/:chainId', (req, res) => {
  const chainId = req.params.chainId;

  const parsed = jsonRpcRequestSchema.safeParse(req.body);
  if (!parsed.success) return rpcError(res, 400, parsed.error, 0);
  const { id, method, params } = parsed.data;

  const handler = handlers[chainId];
  if (!handler) return rpcError(res, 404, new Error('Unsupported chainId'), id);

  handler[method](id, params, res);
});

router.get('/relayers/spaces/:space', (req, res) => {
  const mnemonic = process.env.STARKNET_MNEMONIC || '';
  const { space } = req.params;
  if (!space) return rpcError(res, 400, 'Missing address parameter', 0);

  const normalizedSpaceAddress = validateAndParseAddress(space);
  const index = indexWithAddress(normalizedSpaceAddress);
  const { address } = getStarknetAccount(mnemonic, index);

  res.json({ address });
});

export default router;
