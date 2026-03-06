import express from 'express';
import Highlight from './highlight/highlight';
import { rpcError, rpcSuccess } from './utils';

export default function createRpc(highlight: Highlight) {
  const router = express.Router();

  router.post('/', async (req, res) => {
    const { id, params, method } = req.body;

    switch (method) {
      case 'hl_getMci': {
        try {
          const result = await highlight.getMci();

          return rpcSuccess(res, result, id);
        } catch (err) {
          return rpcError(res, 500, -32000, err, id);
        }
      }

      case 'hl_getUnitReceipt': {
        try {
          const result = await highlight.getUnitReceipt(params);

          return rpcSuccess(res, result, id);
        } catch (err) {
          console.log('e', err);
          return rpcError(res, 500, -32000, err, id);
        }
      }

      case 'hl_postMessage': {
        try {
          const result = await highlight.postMessage(params);

          return rpcSuccess(res, result, id);
        } catch (err) {
          console.log(err);
          return rpcError(res, 500, -32000, err, id);
        }
      }

      default: {
        return rpcError(res, 404, -32601, 'requested method not found', id);
      }
    }
  });

  return router;
}
