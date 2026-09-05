// https://github.com/safe-global/safe-react-apps/blob/c1dff3f93b9de05b3cbbc0627a466038f3571a66/apps/tx-builder/src/typings/models.ts

export interface BatchFile {
  version: string;
  chainId: string;
  createdAt: number;
  meta: BatchFileMeta;
  transactions: BatchTransaction[];
}

export interface BatchFileMeta {
  txBuilderVersion?: string;
  checksum?: string;
  createdFromSafeAddress?: string;
  createdFromOwnerAddress?: string;
  name: string;
  description?: string;
}

export interface BatchTransaction {
  to: string;
  value: string;
  data?: string;
  // Not in the Transaction Builder standard; 1 = delegatecall, carried
  // through import and export.
  operation?: string;
  contractMethod?: ContractMethod;
  contractInputsValues?: { [key: string]: string };
}

export interface ContractMethod {
  inputs: ContractInput[];
  name: string;
  payable: boolean;
}

export interface ContractInput {
  // buildBatchFile's contractCall export doesn't produce this; only the
  // hand-written sendToken/sendNft/stakeToken exports do.
  internalType?: string;
  name: string;
  type: string;
  components?: ContractInput[];
}
