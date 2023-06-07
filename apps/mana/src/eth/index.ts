import express from 'express';
import { createNetworkHandler, NETWORKS } from './rpc';

const router = express.Router();

const handlers = Object.fromEntries(
  Object.keys(NETWORKS).map(chainId => [chainId, createNetworkHandler(parseInt(chainId, 10))])
);

router.post('/:chainId?', (req, res) => {
  const chainId = req.params.chainId || '5';
  const handler = handlers[chainId];

  const { id, method, params } = req.body;
  handler[method](id, params, res);
});

export default router;
