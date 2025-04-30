import express from 'express';
import z from 'zod';
import { generateSpaceEVMWallet } from './dependencies';
import { createNetworkHandler, NETWORK_IDS } from './rpc';
import { rpcError } from '../utils';

const jsonRpcRequestSchema = z.object({
  id: z.any(),
  method: z.enum([
    'send',
    'finalizeProposal',
    'execute',
    'executeQueuedProposal',
    'executeStarknetProposal'
  ]),
  params: z.any()
});

const handlers = Object.fromEntries(
  Array.from(NETWORK_IDS.keys()).map(chainId => [
    chainId,
    createNetworkHandler(chainId)
  ])
);

const router = express.Router();

router.post('/:chainId?', (req, res) => {
  const chainId = req.params.chainId || '5';

  const parsed = jsonRpcRequestSchema.safeParse(req.body);
  if (!parsed.success) return rpcError(res, 400, parsed.error, 0);
  const { id, method, params } = parsed.data;

  const handler = handlers[chainId];
  if (!handler) return rpcError(res, 404, new Error('Unsupported chainId'), id);

  handler[method](id, params, res);
});

router.get('/relayers/:networkId/spaces/:space', async (req, res) => {
  if (!req.params.networkId || !req.params.space)
    return rpcError(res, 400, 'Missing chainId or space parameter', 0);

  const normalizedSpaceAddress = req.params.space.toLowerCase();
  const networkId = req.params.networkId;
  const validNetworkIds = Array.from(NETWORK_IDS.values());

  if (!validNetworkIds.includes(networkId))
    return rpcError(res, 400, 'Unsupported networkId', 0);

  const wallet = generateSpaceEVMWallet(networkId, normalizedSpaceAddress);

  res.json({
    address: wallet.address
  });
});

export default router;
