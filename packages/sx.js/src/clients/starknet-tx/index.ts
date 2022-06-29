import { AddTransactionResponse, Contract, defaultProvider as provider, hash } from 'starknet';
import abi from './abi/auth.json';
import constants from './constants.json';
import { strToShortStringArr } from '../../utils/strings';

const { getSelectorFromName } = hash;

export class StarkNetTx {
  async propose(
    author: string,
    space: string,
    executionHash: string,
    metadataUri: string
  ): Promise<AddTransactionResponse> {
    const blockNum: any = '1234567';
    const params: any = [];
    // @ts-ignore
    const auth = new Contract(abi, constants.auth, provider);
    const metadataUriFelt = strToShortStringArr(metadataUri);
    const calldata = [author, executionHash, metadataUriFelt.length.toString()];
    metadataUriFelt.forEach((m) => calldata.push(m.toString()));
    calldata.push(blockNum);
    calldata.push(params.length.toString());
    const receipt = await auth.invoke('execute', {
      // @ts-ignore
      to: space,
      function_selector: getSelectorFromName('propose'),
      calldata
    });
    console.log('Receipt', receipt);
    await provider.waitForTx(receipt.transaction_hash);
    return receipt;
  }

  async vote(
    voter: string,
    space: string,
    proposal: string,
    choice: string
  ): Promise<AddTransactionResponse> {
    const params: any = [];
    // @ts-ignore
    const auth = new Contract(abi, constants.auth, provider);
    const receipt = await auth.invoke('execute', {
      // @ts-ignore
      to: space,
      function_selector: getSelectorFromName('vote'),
      calldata: [voter, proposal, choice, params.length.toString()]
    });
    console.log('Receipt', receipt);
    await provider.waitForTx(receipt.transaction_hash);
    return receipt;
  }
}
