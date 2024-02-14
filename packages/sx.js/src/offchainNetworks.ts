function createStandardConfig(eip712ChainId: number) {
  return {
    eip712ChainId
  };
}

export const offchainMainnet = createStandardConfig(1);
export const offchainGoerli = createStandardConfig(5);
