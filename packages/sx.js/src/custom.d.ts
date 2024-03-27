declare module '@shutter-network/shutter-crypto/dist/shutter-crypto.wasm?url' {
  const wasm: string;
  export default wasm;
}

declare module '@shutter-network/shutter-crypto' {
  export function init(wasm?: string): Promise<void>;
  export function encrypt(
    message: Uint8Array,
    eonPublicKey: Uint8Array,
    epochId: Uint8Array,
    sigma: Uint8Array
  ): Promise<Uint8Array>;
}
