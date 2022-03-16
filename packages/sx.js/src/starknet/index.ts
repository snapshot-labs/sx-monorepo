import { AddTransactionResponse, Contract, defaultProvider as provider, hash } from 'starknet';
import abi from './abi/auth.json';
import constants from './constants.json';
import { strToShortStringArr } from './strings';

const { getSelectorFromName } = hash;

export async function propose(
  space: string,
  executionHash: string,
  metadataUri: string
): Promise<AddTransactionResponse> {
  const proposer: any = constants.user;
  const blockNum: any = '1234567';
  const params: any = [];

  // @ts-ignore
  const auth = new Contract(abi, constants.auth, provider);
  const metadataUriFelt = strToShortStringArr(metadataUri);
  const calldata = [proposer, executionHash, metadataUriFelt.length.toString()];
  metadataUriFelt.forEach((m) => calldata.push(m.toString()));
  calldata.push(blockNum);
  calldata.push(params.length.toString());
  const receipt = await auth.invoke('execute', {
    to: space,
    function_selector: getSelectorFromName('propose'),
    calldata
  });
  console.log('Receipt', receipt);
  await provider.waitForTx(receipt.transaction_hash);
  return receipt;
}

export async function vote(
  space: string,
  proposal: string,
  choice: string
): Promise<AddTransactionResponse> {
  const voter: any = constants.user;
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
