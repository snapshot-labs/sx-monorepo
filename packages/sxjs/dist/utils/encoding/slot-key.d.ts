/**
 * Computes the EVM slot key for a specific mapping value in a contract
 * Eg the key of where the value balances['0x123...'] resides in the contract state can be found by querying
 * this function with '0x123...' and the index of the balances[] mapping in the contract.
 * @param mappingKey The mapping key of the mapping value you want to find the slot key for
 * @param slotIndex The index of the mapping in the contract, can be found from solidity compiler artifacts
 * @returns The slot key of the mapping value, a 32 byte hex string
 */
export declare function getSlotKey(mappingKey: string, slotIndex: string): string;
