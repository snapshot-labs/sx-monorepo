import * as bip32 from '@scure/bip32';
import * as bip39 from '@scure/bip39';
import {
  Account,
  CallData,
  constants,
  ec,
  hash,
  RpcProvider,
  validateAndParseAddress
} from 'starknet';
import { NonceManager } from './nonce-manager';
import { indexWithAddress } from '../utils';

const basePath = "m/44'/9004'/0'/0";
export const contractAXclassHash =
  '0x1a736d6ed154502257f02b1ccdf4d9d1089f80811cd6acad48e6b6a9d1f2003';

const NODE_URLS = new Map<string, string | undefined>([
  [constants.StarknetChainId.SN_MAIN, process.env.STARKNET_MAINNET_RPC_URL],
  [constants.StarknetChainId.SN_SEPOLIA, process.env.STARKNET_SEPOLIA_RPC_URL]
]);

export const ETH_NODE_URLS = new Map<string, string | undefined>([
  [constants.StarknetChainId.SN_MAIN, process.env.ETH_MAINNET_RPC_URL],
  [constants.StarknetChainId.SN_SEPOLIA, process.env.ETH_SEPOLIA_RPC_URL]
]);

export function getProvider(chainId: string) {
  return new RpcProvider({ nodeUrl: NODE_URLS.get(chainId) });
}

export function getStarknetAccount(mnemonic: string, index: number) {
  const masterSeed = bip39.mnemonicToSeedSync(mnemonic);
  const hdKey1 =
    bip32.HDKey.fromMasterSeed(masterSeed).derive("m/44'/60'/0'/0/0");
  const hdKey2 = bip32.HDKey.fromMasterSeed(hdKey1.privateKey!);

  const path = `${basePath}/${index}`;
  const starknetHdKey = hdKey2.derive(path);

  const privateKey = ec.starkCurve.grindKey(starknetHdKey.privateKey!);
  const starkKeyPubAX = ec.starkCurve.getStarkKey(privateKey);

  const address = hash.calculateContractAddressFromHash(
    starkKeyPubAX,
    contractAXclassHash,
    [starkKeyPubAX, 0],
    0
  );

  return { address, privateKey: `0x${privateKey}`, starkKeyPubAX };
}

export const DEFAULT_INDEX = 1;

export function createAccountProxy(mnemonic: string, provider: RpcProvider) {
  const accounts = new Map<
    number,
    {
      account: Account;
      nonceManager: NonceManager;
      deploy: () => Promise<void>;
    }
  >();

  return (spaceAddress: string) => {
    const normalizedSpaceAddress = validateAndParseAddress(spaceAddress);
    const index = indexWithAddress(normalizedSpaceAddress);

    if (!accounts.has(index)) {
      const { address, privateKey, starkKeyPubAX } = getStarknetAccount(
        mnemonic,
        index
      );

      const account = new Account(provider, address, privateKey);
      const nonceManager = new NonceManager(account);

      const deploy = async () => {
        // check if account is already deployed
        let accountDeployed = false;
        try {
          const accountState = await provider.getClassAt(address);
          accountDeployed = accountState.abi !== null;
        } catch (e: any) {
          if (e.message.includes('Contract not found')) {
            accountDeployed = false;
          } else {
            console.error('Error fetching account state', e);
            throw e;
          }
        }

        console.log('Account deployed', accountDeployed);
        if (!accountDeployed) {
          const AXConstructorCallData = CallData.compile({
            owner: starkKeyPubAX,
            guardian: '0'
          });
          const deployResponse = await account.deployAccount({
            classHash: contractAXclassHash,
            constructorCalldata: AXConstructorCallData,
            contractAddress: address,
            addressSalt: starkKeyPubAX
          });
          await provider.waitForTransaction(deployResponse.transaction_hash);
        }
      };
      accounts.set(index, { account, nonceManager, deploy });
    }

    return accounts.get(index)!;
  };
}
