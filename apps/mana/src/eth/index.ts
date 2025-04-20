import { StaticJsonRpcProvider } from '@ethersproject/providers';
import express from 'express';
import z from 'zod';
import { DEFAULT_INDEX, getEthereumWallet } from './dependencies';
import { createNetworkHandler, NETWORKS } from './rpc';
import { indexWithAddress, rpcError } from '../utils';

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

router.get('/relayers', (req, res) => {
  const mnemonic = process.env.ETH_MNEMONIC || '';

  const defaultRelayer = getEthereumWallet(mnemonic, DEFAULT_INDEX).address;

  res.json({
    default: defaultRelayer
  });
});

router.get('/relayer/:space', async (req, res) => {
  const { space } = req.params;
  if (!space) return rpcError(res, 400, 'Missing address parameter', 0);

  const mnemonic = process.env.ETH_MNEMONIC || '';
  const normalizedSpaceAddress = space.toLowerCase();
  const index = indexWithAddress(normalizedSpaceAddress);
  const { address } = getEthereumWallet(mnemonic, index);

  res.json({
    address
  });
});

export default router;
