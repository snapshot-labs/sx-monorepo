import express from 'express';
import fetch from 'cross-fetch';
import { Wallet } from '@ethersproject/wallet';
import { Contract } from '@ethersproject/contracts';
import { JsonRpcProvider } from '@ethersproject/providers';
import { utils } from '@snapshot-labs/sx';
import { defaultProvider, Account, ec } from 'starknet';

const ethPrivkey = process.env.ETH_PRIVKEY || '';
const ethRpcUrl = process.env.ETH_RPC_URL || '';
const provider = new JsonRpcProvider(ethRpcUrl);
let wallet = new Wallet(ethPrivkey);
wallet = wallet.connect(provider);

const fossilAddress = process.env.FOSSIL_ADDRESS || '';
const fossilL1HeadersStoreAddress =
  '0x69606dd1655fdbbf8189e88566c54890be8f7e4a3650398ac17f6586a4a336d';

const abi = ['function sendExactParentHashToL2(uint256)', 'function sendLatestParentHashToL2()'];

const starknetPrivkey = process.env.STARKNET_PRIVKEY || '';
const starknetAddress = process.env.STARKNET_ADDRESS || '';
const starkKeyPair = ec.getKeyPair(starknetPrivkey);
const starknetAccount = new Account(defaultProvider, starknetAddress, starkKeyPair);

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

async function processBlock(blockNumber: number) {
  const res = await fetch(ethRpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_getBlockByNumber',
      params: [`0x${blockNumber.toString(16)}`, false],
      id: 1
    })
  });
  const block = (await res.json()).result;
  const processBlockInputs = utils.storageProofs.getProcessBlockInputs(block);
  return starknetAccount.execute(
    [
      {
        contractAddress: fossilL1HeadersStoreAddress,
        entrypoint: 'process_block',
        calldata: [
          processBlockInputs.blockOptions,
          processBlockInputs.blockNumber,
          processBlockInputs.headerInts.bytesLength,
          processBlockInputs.headerInts.values.length,
          // @ts-ignore
          ...processBlockInputs.headerInts.values
        ]
      }
    ],
    undefined,
    { maxFee: '857400005301800' }
  );
}

const router = express.Router();

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

router.get('/process/:blockNum', async (req, res) => {
  const { blockNum } = req.params;
  try {
    const result = await processBlock(parseInt(blockNum));
    return res.json({ result });
  } catch (e) {
    console.log('Process block failed', e);
  }
});

export default router;
