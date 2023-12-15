import express from 'express';
import { createNetworkHandler } from './rpc';
import { NETWORKS } from './networks';
import { DEFAULT_INDEX, SPACES_INDICIES, getStarknetAccount } from './dependencies';
import { handleStorageWebhook } from './herodotus';

const router = express.Router();

const handlers = Object.fromEntries(
  Object.keys(NETWORKS).map(chainId => [chainId, createNetworkHandler(chainId)])
);

router.get('/:chainId/storage-webhook', async (req, res) => {
  const chainId = req.params.chainId;
  const handler = handlers[chainId];

  const { timestamp, strategyAddress, key } = req.query;
  if (!timestamp || !strategyAddress || !key) {
    return res.status(400).json({ error: 'Missing required params' });
  }

  const result = await handleStorageWebhook({
    account: handler.getAccount('0x0'), // we can't reliably get space address for this callback, it's only one call per proposal, should be fine
    timestamp: parseInt(timestamp.toString(), 10),
    strategyAddress: strategyAddress.toString(),
    key: key.toString()
  });

  res.json({
    result
  });
});

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
