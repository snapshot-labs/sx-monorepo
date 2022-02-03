import express from 'express';
import { defaultProvider as provider, stark } from 'starknet';
import constants from './constants.json';

const router = express.Router();
const { getSelectorFromName } = stark;

router.post('/', async (req, res) => {
  const { method, params, id } = req.body;
  try {
    console.time('addTransaction');
    const receipt = await provider.invokeFunction(
      constants.votingContract,
      getSelectorFromName('propose'),
      ['123', '456']
    );
    console.log('Receipt', receipt);
    console.timeEnd('addTransaction');
    return res.json({
      jsonrpc: '2.0',
      result: receipt,
      id
    });
  } catch (e) {
    const code = 500;
    return res.status(code).json({
      jsonrpc: '2.0',
      error: {
        code,
        message: 'unauthorized',
        data: e
      },
      id: null
    });
  }
});

export default router;
