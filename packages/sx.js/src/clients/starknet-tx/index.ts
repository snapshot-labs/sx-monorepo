import {
  Abi,
  Account,
  AddTransactionResponse,
  Contract,
  defaultProvider as provider,
  hash
} from 'starknet';
import abi from './abi/auth.json';
import constants from './constants.json';
import { strToShortStringArr } from '../../utils/strings';

const { getSelectorFromName } = hash;

export class StarkNetTx {
  async propose(
    account: Account,
    author: string,
    space: string,
    executionHash: string,
    metadataUri: string
  ): Promise<AddTransactionResponse> {
    const blockNum: any = '1234567';
    const params: any = [];

    const auth = new Contract(abi as Abi, constants.auth, provider);
    auth.connect(account);

    const metadataUriFelt = strToShortStringArr(metadataUri);
    const calldata = [author, executionHash, metadataUriFelt.length.toString()];
    metadataUriFelt.forEach((m) => calldata.push(m.toString()));
    calldata.push(blockNum);
    calldata.push(params.length.toString());

    const fee = await auth.estimateFee.execute(space, getSelectorFromName('propose'), calldata);

    return await auth.invoke('execute', [space, getSelectorFromName('propose'), calldata], {
      maxFee: fee.suggestedMaxFee
    });
  }

  async vote(
    account: Account,
    voter: string,
    space: string,
    proposal: string,
    choice: string
  ): Promise<AddTransactionResponse> {
    const calldata: any[] = [voter, proposal, choice, '0'];

    const auth = new Contract(abi as Abi, constants.auth, provider);
    auth.connect(account);

    const fee = await auth.estimateFee.execute(space, getSelectorFromName('vote'), calldata);

    return await auth.invoke('execute', [space, getSelectorFromName('vote'), calldata], {
      maxFee: fee.suggestedMaxFee
    });
  }
}
