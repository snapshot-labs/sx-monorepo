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

const MNEMONIC = process.env.STARKNET_MNEMONIC || '';

const contractAXclassHash =
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

export function generateSpaceStarknetWallet(spaceAddress: string) {
  // Create a deterministic seed from the space address and mnemonic
  const combinedSeed = `${spaceAddress}:${MNEMONIC}`;
  const hashedSeed = hash.starknetKeccak(combinedSeed);
  const hashedSeedHex = hashedSeed.toString(16).padStart(64, '0');
  const privateKey = ec.starkCurve.grindKey(`0x${hashedSeedHex}`);
  const starkKeyPubAX = ec.starkCurve.getStarkKey(privateKey);

  const address = hash.calculateContractAddressFromHash(
    starkKeyPubAX,
    contractAXclassHash,
    [starkKeyPubAX, 0],
    0
  );

  return { address, privateKey: `0x${privateKey}`, starkKeyPubAX };
}

export async function isAccountDeployed(
  provider: RpcProvider,
  address: string
): Promise<boolean> {
  try {
    const accountState = await provider.getClassAt(address);
    return accountState.abi !== null;
  } catch {
    return false;
  }
}

export async function deployContract(
  account: Account,
  provider: RpcProvider,
  starkKeyPubAX: string,
  contractAddress: string
): Promise<void> {
  const AXConstructorCallData = CallData.compile({
    owner: starkKeyPubAX,
    guardian: '0'
  });
  const deployResponse = await account.deployAccount({
    classHash: contractAXclassHash,
    constructorCalldata: AXConstructorCallData,
    contractAddress,
    addressSalt: starkKeyPubAX
  });
  await provider.waitForTransaction(deployResponse.transaction_hash);
}

export function createAccountProxy(mnemonic: string, provider: RpcProvider) {
  const accounts = new Map<
    string,
    {
      account: Account;
      nonceManager: NonceManager;
      deployAccount: () => Promise<void>;
    }
  >();

  return (spaceAddress: string) => {
    const normalizedSpaceAddress = validateAndParseAddress(spaceAddress);

    if (!accounts.has(normalizedSpaceAddress)) {
      // Use the deterministic account derivation instead of index-based
      const { address, privateKey, starkKeyPubAX } =
        generateSpaceStarknetWallet(normalizedSpaceAddress);

      const account = new Account(provider, address, privateKey);
      const nonceManager = new NonceManager(account);

      const deployAccount = async () => {
        // check if account is already deployed
        const accountDeployed = await isAccountDeployed(provider, address);
        if (!accountDeployed) {
          await deployContract(account, provider, starkKeyPubAX, address);
        }
      };
      accounts.set(normalizedSpaceAddress, {
        account,
        nonceManager,
        deployAccount
      });
    }

    return accounts.get(normalizedSpaceAddress)!;
  };
}
