import express from 'express';
import { Wallet } from '@ethersproject/wallet';
import { Contract } from '@ethersproject/contracts';
import { JsonRpcProvider } from '@ethersproject/providers';

const router = express.Router();

const ethPrivkey = process.env.ETH_PRIVKEY || '';
const fossilAddress = process.env.FOSSIL_ADDRESS || '0x738bfb83246156b759165d244077865b994f9d33';

const provider = new JsonRpcProvider('https://rpc.brovider.xyz/5');
let wallet = new Wallet(ethPrivkey);
wallet = wallet.connect(provider);
const abi = ['function sendExactParentHashToL2(uint256)', 'function sendLatestParentHashToL2()'];

async function sendExactParentHashToL2(blockNumber: number) {
  const contract = new Contract(fossilAddress, abi);
  const contractWithSigner = contract.connect(wallet);
  return contractWithSigner.sendExactParentHashToL2(blockNumber);
}

async function sendLatestParentHashToL2() {
  const contract = new Contract(fossilAddress, abi);
  const contractWithSigner = contract.connect(wallet);
  return contractWithSigner.sendLatestParentHashToL2();
}

router.get('/send/:blockNum?', async (req, res) => {
  const { blockNum } = req.params;
  try {
    const result = await (blockNum
      ? sendExactParentHashToL2(parseInt(blockNum))
      : sendLatestParentHashToL2());
    return res.json({ result });
  } catch (e) {
    console.log('Send parent hash failed', e);
  }
});

export default router;
