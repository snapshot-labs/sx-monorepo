import { Signer, TypedDataSigner, TypedDataField } from '@ethersproject/abstract-signer';
import { ClientConfig, ClientOpts, Envelope, Propose, UpdateProposal, Vote, EIP712ProposeMessage, EIP712UpdateProposalMessage, EIP712VoteMessage, SignatureData } from '../../../types';
export declare class EthereumSig {
    config: ClientConfig;
    constructor(opts: ClientOpts);
    generateSalt(): string;
    sign<T extends EIP712ProposeMessage | EIP712UpdateProposalMessage | EIP712VoteMessage>(signer: Signer & TypedDataSigner, message: T, types: Record<string, TypedDataField[]>, primaryType: string): Promise<SignatureData>;
    propose({ signer, data }: {
        signer: Signer & TypedDataSigner;
        data: Propose;
    }): Promise<Envelope<Propose>>;
    updateProposal({ signer, data }: {
        signer: Signer & TypedDataSigner;
        data: UpdateProposal;
    }): Promise<Envelope<UpdateProposal>>;
    vote({ signer, data }: {
        signer: Signer & TypedDataSigner;
        data: Vote;
    }): Promise<Envelope<Vote>>;
}
