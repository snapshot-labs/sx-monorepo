import { Interface } from '@ethersproject/abi';

export interface Transaction {
  to: string;
  data: string;
  value: string;
  abi: string[];
  method: string;
  args: any[];
}

export interface Abi {
  network: string;
  address: string;
  verified: boolean;
  abi: string[];
}

export class Builder {
  public network: string;
  public txs: Transaction[] = [];
  public abis: Abi[] = [];

  constructor(network: string) {
    this.network = network;
  }

  addTx(tx: Transaction) {
    const iface = new Interface(tx.abi);
    tx.data = iface.encodeFunctionData(tx.method, tx.args);
    this.txs.push(tx);
  }
}
