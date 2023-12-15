import express from 'express';
import { createNetworkHandler } from './rpc';
import { NETWORKS } from './networks';
import { DEFAULT_INDEX, SPACES_INDICIES, getStarknetAccount } from './dependencies';

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

router.get('/relayers', (req, res) => {
  const mnemonic = process.env.STARKNET_MNEMONIC || '';

  const defaultRelayer = getStarknetAccount(mnemonic, DEFAULT_INDEX).address;
  const relayers = Object.fromEntries(
    Object.entries(SPACES_INDICIES).map(([spaceAddress, index]) => {
      const { address } = getStarknetAccount(mnemonic, index);
      return [spaceAddress, address];
    })
  );

  res.json({
    default: defaultRelayer,
    ...relayers
  });
});

export default router;
