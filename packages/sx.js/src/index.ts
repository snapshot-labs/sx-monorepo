import { Contract, defaultProvider as provider, hash } from 'starknet';
import constants from './constants.json';
import abi from './abi/auth.json';

const { getSelectorFromName } = hash;

export async function propose() {
  const space: any = constants.space;
  const executionHash: any = '1';
  const metadataUri: any = '2';
  const proposer: any = constants.user;
  const blockNum: any = '1337';
  const params: any = [];

  // @ts-ignore
  const auth = new Contract(abi, constants.auth, provider);

  const tx = await auth.invoke('execute', {
    to: space,
    function_selector: getSelectorFromName('propose'),
    calldata: [proposer, executionHash, metadataUri, blockNum, params.length.toString()]
  });
  return await provider.waitForTx(tx.transaction_hash);
}

export async function vote() {
  const space: any = constants.space;
  const voter: any = constants.user;
  const proposal = '1';
  const params: any = [];

  // @ts-ignore
  const auth = new Contract(abi, constants.auth, provider);

  const tx = await auth.invoke('execute', {
    to: space,
    function_selector: getSelectorFromName('vote'),
    calldata: [voter, proposal, '1', params.length.toString()]
  });
  return await provider.waitForTx(tx.transaction_hash);
}
