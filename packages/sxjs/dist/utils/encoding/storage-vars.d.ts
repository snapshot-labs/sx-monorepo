/**
 * Returns the storage address of a StarkNet storage variable given its name and arguments.
 * https://github.com/starkware-libs/cairo-lang/blob/d61255f32a7011e9014e1204471103c719cfd5cb/src/starkware/starknet/public/abi.py#L60-L70
 * @param varName storage_var name
 * @param args additional arguments
 */
export declare function getStorageVarAddress(varName: string, ...args: string[]): string;
export declare function offsetStorageVar(address: string, offset: number): string;
