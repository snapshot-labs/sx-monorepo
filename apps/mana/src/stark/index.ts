import express from 'express';
import { createNetworkHandler } from './rpc';
import { NETWORKS } from './networks';

const router = express.Router();

const handlers = Object.fromEntries(
  Object.keys(NETWORKS).map(chainId => [chainId, createNetworkHandler(chainId)])
);

router.post('/:chainId', (req, res) => {
  const chainId = req.params.chainId;
  const handler = handlers[chainId];

  const { id, method, params } = req.body;
  handler[method](id, params, res);
});

export default router;
