import express from 'express';
import { validateAndParseAddress } from 'starknet';
import z from 'zod';
import { generateSpaceStarknetWallet } from './dependencies';
import { NETWORK_IDS, NETWORKS } from './networks';
import { createNetworkHandler } from './rpc';
import { rpcError } from '../utils';

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

router.get('/relayers/:networkId/spaces/:space', (req, res) => {
  if (!req.params.networkId || !req.params.space)
    return rpcError(res, 400, 'Missing chainId or space parameter', 0);

  const normalizedSpaceAddress = validateAndParseAddress(req.params.space);
  const networkId = req.params.networkId;
  const validNetworkIds = Array.from(NETWORK_IDS.values());

  if (!validNetworkIds.includes(networkId))
    return rpcError(res, 400, 'Unsupported networkId', 0);

  const { address } = generateSpaceStarknetWallet(
    networkId,
    normalizedSpaceAddress
  );

  res.json({ address });
});

export default router;
