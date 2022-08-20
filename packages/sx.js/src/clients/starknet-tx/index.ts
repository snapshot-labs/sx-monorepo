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
import * as utils from '../../utils';

const { getSelectorFromName } = hash;

export class StarkNetTx {
  async propose(
    account: Account,
    author: string,
    space: string,
    metadataUri: string
  ): Promise<AddTransactionResponse> {
    const auth = new Contract(abi as Abi, constants.auth, provider);
    auth.connect(account);

    const metadataUriInts = utils.intsSequence.IntsSequence.LEFromString(metadataUri);
    const calldata = utils.encoding.getProposeCalldata(
      author,
      metadataUriInts,
      constants.executor,
      [constants.strategy],
      [[]],
      []
    );

    const fee = await auth.estimateFee.authenticate(
      space,
      getSelectorFromName('propose'),
      calldata
    );

    return await auth.invoke('authenticate', [space, getSelectorFromName('propose'), calldata], {
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
    const auth = new Contract(abi as Abi, constants.auth, provider);
    auth.connect(account);

    const calldata = utils.encoding.getVoteCalldata(
      voter,
      proposal,
      Number(choice),
      [constants.strategy],
      [[]]
    );

    const fee = await auth.estimateFee.authenticate(space, getSelectorFromName('vote'), calldata);

    return await auth.invoke('authenticate', [space, getSelectorFromName('vote'), calldata], {
      maxFee: fee.suggestedMaxFee
    });
  }
}
