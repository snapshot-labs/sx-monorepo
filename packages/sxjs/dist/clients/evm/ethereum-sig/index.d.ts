import type { Signer, TypedDataSigner, TypedDataField } from '@ethersproject/abstract-signer';
import type { Propose, UpdateProposal, Vote, Envelope, SignatureData, EIP712ProposeMessage, EIP712UpdateProposalMessage, EIP712VoteMessage } from '../types';
import type { EvmNetworkConfig } from '../../../types';
type EthereumSigClientOpts = {
    networkConfig?: EvmNetworkConfig;
    manaUrl?: string;
};
export declare class EthereumSig {
    manaUrl: string;
    networkConfig: EvmNetworkConfig;
    constructor(opts?: EthereumSigClientOpts);
    generateSalt(): number;
    sign<T extends EIP712ProposeMessage | EIP712UpdateProposalMessage | EIP712VoteMessage>(signer: Signer & TypedDataSigner, verifyingContract: string, message: T, types: Record<string, TypedDataField[]>): Promise<SignatureData>;
    send(envelope: any): Promise<any>;
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
export {};
