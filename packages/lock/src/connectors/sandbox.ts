import { arrayify } from '@ethersproject/bytes';
import { Wallet } from '@ethersproject/wallet';
import Connector from './connector';

const KEY = 'SANDBOX_PRIVATE_KEY';
const PRIVATE_KEY_REGEX = /^0x[0-9a-fA-F]{64}$/;

function createProvider(privateKey: string) {
  const wallet = new Wallet(privateKey);

  const signMessage = (data: any) =>
    wallet.signMessage(
      typeof data === 'string' && data.startsWith('0x') ? arrayify(data) : data
    );

  const signTypedData = (raw: any) => {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const types = { ...data.types };
    delete types.EIP712Domain;
    return wallet._signTypedData(data.domain, types, data.message);
  };

  return {
    selectedAddress: wallet.address,
    chainId: 1,
    request: async ({
      method,
      params = []
    }: {
      method: string;
      params?: any[];
    }) => {
      switch (method) {
        case 'eth_chainId':
        case 'net_version':
          return 1;
        case 'eth_accounts':
        case 'eth_requestAccounts':
          return [wallet.address];
        case 'personal_sign':
          return signMessage(params[0]);
        case 'eth_sign':
          return signMessage(params[1]);
        case 'eth_signTypedData':
        case 'eth_signTypedData_v3':
        case 'eth_signTypedData_v4':
          return signTypedData(params[1]);
      }
      throw new Error(`Method ${method} not supported`);
    }
  };
}

export default class Sandbox extends Connector {
  async connect() {
    const params = new URLSearchParams(
      window.location.hash.split('?')[1] ?? ''
    );
    const login = params.get('login') ?? '';
    const pk = PRIVATE_KEY_REGEX.test(login)
      ? login
      : Wallet.createRandom().privateKey;
    localStorage.setItem(KEY, pk);
    this.provider = createProvider(pk);
  }

  async autoConnect() {
    const pk = localStorage.getItem(KEY);
    if (pk) this.provider = createProvider(pk);
  }

  async disconnect() {
    localStorage.removeItem(KEY);
  }
}
