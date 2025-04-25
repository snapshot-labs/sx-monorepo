import express from 'express';
import z from 'zod';
import { generateSpaceEVMWallet } from './dependencies';
import { createNetworkHandler, NETWORKS } from './rpc';
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
  Array.from(NETWORKS.keys()).map(chainId => [
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

router.get('/relayers/spaces/:space', async (req, res) => {
  const normalizedSpaceAddress = req.params.space.toLowerCase();

  const wallet = generateSpaceEVMWallet(normalizedSpaceAddress);

  res.json({
    address: wallet.address
  });
});

export default router;
