import express from 'express';
import z from 'zod';
import { generateSpaceEvmWallet } from './dependencies';
import { createNetworkHandler, NETWORK_IDS } from './rpc';
import { rpcError } from '../utils';

const validNetworkIds = Array.from(NETWORK_IDS.values());
const jsonRpcRequestSchema = z.object({
  id: z.any(),
  method: z.enum([
    'send',
    'finalizeProposal',
    'execute',
    'executeQueuedProposal',
    'executeStarknetProposal',
    'registerApeGasProposal'
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

router.get('/relayers/spaces/:space', async (req, res) => {
  const spaceArray = req.params.space.split(':');
  if (spaceArray.length !== 2 || !spaceArray[0] || !spaceArray[1])
    return rpcError(res, 400, 'Missing space parameter or invalid format', 0);

  const [networkId, spaceAddress] = spaceArray;

  if (!validNetworkIds.includes(networkId))
    return rpcError(res, 400, 'Invalid networkId', 0);

  const normalizedSpaceAddress = spaceAddress.toLowerCase();
  const wallet = generateSpaceEvmWallet(networkId, normalizedSpaceAddress);

  res.json({
    address: wallet.address
  });
});

export default router;
