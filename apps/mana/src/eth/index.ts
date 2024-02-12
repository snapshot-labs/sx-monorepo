import express from 'express';
import { createNetworkHandler, NETWORKS } from './rpc';
import { getEthereumWallet } from './dependencies';
import { DEFAULT_INDEX, SPACES_INDICIES } from '../stark/dependencies';

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

router.get('/relayers', (req, res) => {
  const mnemonic = process.env.ETH_MNEMONIC || '';

  const defaultRelayer = getEthereumWallet(mnemonic, DEFAULT_INDEX).address;
  const relayers = Object.fromEntries(
    Object.entries(SPACES_INDICIES).map(([spaceAddress, index]) => {
      const { address } = getEthereumWallet(mnemonic, index);
      return [spaceAddress, address];
    })
  );

  res.json({
    default: defaultRelayer,
    ...relayers
  });
});

export default router;
