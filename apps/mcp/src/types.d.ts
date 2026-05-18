declare module '*.md' {
  const content: string;
  export default content;
}

declare module '@shutter-network/shutter-crypto' {
  export function init(wasmPath?: string): Promise<void>;
}
