import { Signer } from '@ethersproject/abstract-signer';
import { ClientConfig, ClientOpts, Envelope, Propose, UpdateProposal, Vote } from '../../../types';
type CallOptions = {
    noWait?: boolean;
};
export declare class EthereumTx {
    config: ClientConfig & {
        sequencerUrl: string;
    };
    constructor(opts: ClientOpts & {
        sequencerUrl?: string;
    });
    getMessageFee(l2Address: string, payload: string[]): Promise<{
        overall_fee: number;
    }>;
    estimateProposeFee(signer: Signer, data: Propose): Promise<{
        overall_fee: number;
    }>;
    estimateVoteFee(signer: Signer, data: Vote): Promise<{
        overall_fee: number;
    }>;
    estimateUpdateProposalFee(signer: Signer, data: UpdateProposal): Promise<{
        overall_fee: number;
    }>;
    getProposeHash(signer: Signer, data: Propose): Promise<string>;
    getVoteHash(signer: Signer, data: Vote): Promise<string>;
    getUpdateProposalHash(signer: Signer, data: UpdateProposal): Promise<string>;
    initializePropose(signer: Signer, data: Propose, opts?: CallOptions): Promise<Envelope<Propose>>;
    initializeVote(signer: Signer, data: Vote, opts?: CallOptions): Promise<Envelope<Vote>>;
    initializeUpdateProposal(signer: Signer, data: UpdateProposal, opts?: CallOptions): Promise<Envelope<UpdateProposal>>;
}
export {};
