import express from 'express';
import { Account, ec } from 'starknet';
import { clients } from '@snapshot-labs/sx';
import { starkProvider } from './starkProvider';

const starknetPrivkey = process.env.STARKNET_PRIVKEY || '';
const starknetAddress = process.env.STARKNET_ADDRESS || '';
const starkKeyPair = ec.getKeyPair(starknetPrivkey);
const executor = '0x21dda40770f4317582251cffd5a0202d6b223dc167e5c8db25dc887d11eba81';

const account = new Account(starkProvider, starknetAddress, starkKeyPair);
const spaceManager = new clients.SpaceManager({
  starkProvider,
  account
});

const router = express.Router();

router.post('/:space/:proposalId/finalize', async (req, res) => {
  const { space, proposalId } = req.params;
  const { transactions } = req.body;

  try {
    const receipt = await spaceManager.finalizeProposal(space, parseInt(proposalId), executor, {
      transactions
    });
    return res.json({ receipt });
  } catch (e) {
    console.log('finalize failed', e);
    return res.json({ receipt: null, error: true });
  }
});

export default router;
