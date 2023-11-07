import { Account } from 'starknet';
import { ClientConfig, ClientOpts, Envelope, Propose, UpdateProposal, Vote, StarknetEIP712ProposeMessage, StarknetEIP712UpdateProposalMessage, StarknetEIP712VoteMessage, SignatureData } from '../../../types';
export declare class StarkNetSig {
    config: ClientConfig & {
        manaUrl: string;
    };
    constructor(opts: ClientOpts & {
        manaUrl: string;
    });
    generateSalt(): string;
    send(envelope: any): Promise<any>;
    sign<T extends StarknetEIP712ProposeMessage | StarknetEIP712UpdateProposalMessage | StarknetEIP712VoteMessage>(signer: Account, verifyingContract: string, message: T, types: any, primaryType: string): Promise<SignatureData>;
    propose({ signer, data }: {
        signer: Account;
        data: Propose;
    }): Promise<Envelope<Propose>>;
    updateProposal({ signer, data }: {
        signer: Account;
        data: UpdateProposal;
    }): Promise<Envelope<UpdateProposal>>;
    vote({ signer, data }: {
        signer: Account;
        data: Vote;
    }): Promise<Envelope<Vote>>;
}
