import express from 'express';
import { validateAndParseAddress } from 'starknet';
import z from 'zod';
import { generateSpaceStarknetWallet } from './dependencies';
import logger from './logger';
import { NETWORK_IDS, NETWORKS } from './networks';
import { createNetworkHandler } from './rpc';
import { rpcError } from '../utils';

const validNetworkIds = Array.from(NETWORK_IDS.values());
const jsonRpcRequestSchema = z.object({
  id: z.any(),
  method: z.enum([
    'send',
    'execute',
    'registerTransaction',
    'registerProposal',
    'getDataByMessageHash'
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

  logger.info({ chainId, method }, 'Received RPC request');

  const handler = handlers[chainId];
  if (!handler) return rpcError(res, 404, new Error('Unsupported chainId'), id);

  handler[method](id, params, res);
});

router.get('/relayers/spaces/:space', (req, res) => {
  const spaceArray = req.params.space.split(':');
  if (spaceArray.length !== 2 || !spaceArray[0] || !spaceArray[1])
    return rpcError(res, 400, 'Missing space parameter or invalid format', 0);

  const [networkId, spaceAddress] = spaceArray;

  if (!validNetworkIds.includes(networkId))
    return rpcError(res, 400, 'Invalid networkId', 0);

  let normalizedSpaceAddress;
  try {
    normalizedSpaceAddress = validateAndParseAddress(spaceAddress);
  } catch {
    return rpcError(res, 400, 'Invalid space address', 0);
  }

  const { address } = generateSpaceStarknetWallet(
    networkId,
    normalizedSpaceAddress
  );

  res.json({ address });
});

export default router;
