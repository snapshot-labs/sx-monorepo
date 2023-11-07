export declare enum AddressType {
    STARKNET = 0,
    ETHEREUM = 1,
    CUSTOM = 2
}
export declare class Leaf {
    readonly type: AddressType;
    readonly address: string;
    readonly votingPower: bigint;
    constructor(type: AddressType, address: string, votingPower: bigint);
    get hash(): string;
}
export declare function generateMerkleRoot(hashes: string[]): any;
export declare function generateMerkleProof(hashes: string[], index: number): any;
