import { AddTransactionResponse, Contract, defaultProvider as provider, hash} from 'starknet';
import abi from './abi/auth.json';
import constants from './constants.json';

const { getSelectorFromName } = hash;

export async function propose(space: string): Promise<AddTransactionResponse> {
  const executionHash: any = '1';
  const metadataUri: any = '2';
  const proposer: any = constants.user;
  const blockNum: any = '1234567';
  const params: any = [];

  // @ts-ignore
  const auth = new Contract(abi, constants.auth, provider);

  const receipt = await auth.invoke('execute', {
    to: space,
    function_selector: getSelectorFromName('propose'),
    calldata: [proposer, executionHash, metadataUri, blockNum, params.length.toString()]
  });
  console.log('Receipt', receipt);
  await provider.waitForTx(receipt.transaction_hash);
  return receipt;
}

export async function vote(space: string): Promise<AddTransactionResponse> {
  const voter: any = constants.user;
  const proposal = '1';
  const choice = '2';
  const params: any = [];

  // @ts-ignore
  const auth = new Contract(abi, constants.auth, provider);

  const receipt = await auth.invoke('execute', {
    to: space,
    function_selector: getSelectorFromName('vote'),
    calldata: [voter, proposal, choice, params.length.toString()]
  });
  console.log('Receipt', receipt);
  await provider.waitForTx(receipt.transaction_hash);
  return receipt;
}
