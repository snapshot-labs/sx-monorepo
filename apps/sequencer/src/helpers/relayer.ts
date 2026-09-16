import { Wallet } from '@ethersproject/wallet';

const privateKey = process.env.RELAYER_PK;
if (!privateKey) {
  throw new Error(
    'RELAYER_PK environment variable is required to sign relayer receipts'
  );
}
const wallet = new Wallet(privateKey);

// @TODO use EIP712 for relayer message
export async function issueReceipt(id) {
  return await wallet.signMessage(id);
}

export default wallet;
