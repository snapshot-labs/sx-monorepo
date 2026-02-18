/**
 * Example: Getting a space controller for an offchain Snapshot space
 * 
 * This example demonstrates how to use the new getSpaceController action
 * to retrieve the controller address for various types of domain names.
 */

import { clients } from '@snapshot-labs/sx';
import { providers } from '@ethersproject/providers';

async function examples() {
  // Example 1: Get controller for an ENS domain on mainnet
  console.log('\n=== Example 1: ENS domain on mainnet ===');
  const ethProvider = new providers.JsonRpcProvider('https://rpc.ankr.com/eth');
  
  const ensController = await clients.offchainActions.getSpaceController({
    spaceId: 'snapshot.eth',
    networkId: 's',
    provider: ethProvider
  });
  
  console.log('Controller for snapshot.eth:', ensController);

  // Example 2: Get controller for an ENS domain on testnet (Sepolia)
  console.log('\n=== Example 2: ENS domain on testnet ===');
  const sepoliaProvider = new providers.JsonRpcProvider(
    'https://rpc.ankr.com/eth_sepolia'
  );
  
  const testnetController = await clients.offchainActions.getSpaceController({
    spaceId: 'test.eth',
    networkId: 's-tn',
    provider: sepoliaProvider
  });
  
  console.log('Controller for test.eth (testnet):', testnetController);

  // Example 3: Get controller for a Shibarium domain
  console.log('\n=== Example 3: Shibarium domain ===');
  const shibariumProvider = new providers.JsonRpcProvider(
    'https://rpc.shibarium.io'
  );
  
  const shibController = await clients.offchainActions.getSpaceController({
    spaceId: 'example.shib',
    networkId: 's',
    provider: shibariumProvider
  });
  
  console.log('Controller for example.shib:', shibController);

  // Example 4: Get controller for a Sonic/Unstoppable domain
  console.log('\n=== Example 4: Sonic/Unstoppable domain ===');
  const sonicProvider = new providers.JsonRpcProvider(
    'https://rpc.soniclabs.com'
  );
  
  const sonicController = await clients.offchainActions.getSpaceController({
    spaceId: 'example.sonic',
    networkId: 's',
    provider: sonicProvider
  });
  
  console.log('Controller for example.sonic:', sonicController);
}

// Run examples
if (require.main === module) {
  examples()
    .then(() => console.log('\n✓ All examples completed'))
    .catch(error => console.error('Error:', error));
}

export { examples };
