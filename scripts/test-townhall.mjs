/**
 * End-to-end test for the Townhall refactoring.
 * Uses Anvil's default account to sign EIP-712 envelopes,
 * sends them through Mana to the Poster contract,
 * then polls Highlight's GraphQL to verify indexing.
 */

import { Wallet } from '@ethersproject/wallet';
import { StaticJsonRpcProvider } from '@ethersproject/providers';

const MANA_URL = 'http://localhost:3001';
const HIGHLIGHT_URL = 'http://localhost:3002';
const ANVIL_RPC = 'http://127.0.0.1:8545';
const CHAIN_ID = 8453;

// Anvil default account #0
const PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

const HIGHLIGHT_DOMAIN = { name: 'highlight', version: '0.1.0' };
const TOWNHALL_ADDRESS = '0x0000000000000000000000000000000000000002';

const provider = new StaticJsonRpcProvider(ANVIL_RPC, CHAIN_ID);
const wallet = new Wallet(PRIVATE_KEY, provider);

function randomSalt() {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return '0x' + Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function signEnvelope(primaryType, types, message) {
  const domain = {
    ...HIGHLIGHT_DOMAIN,
    chainId: CHAIN_ID,
    salt: randomSalt(),
    verifyingContract: TOWNHALL_ADDRESS,
  };

  const signature = await wallet._signTypedData(domain, types, message);

  return {
    type: 'HIGHLIGHT_ENVELOPE',
    domain,
    message,
    primaryType,
    signer: await wallet.getAddress(),
    signature,
  };
}

async function sendToMana(envelope) {
  const res = await fetch(`${MANA_URL}/eth_rpc/${CHAIN_ID}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'sendTownhallEnvelope',
      params: { envelope },
      id: 1,
    }),
  });
  const json = await res.json();
  if (json.error) throw new Error(`Mana error: ${JSON.stringify(json.error)}`);
  return json.result;
}

async function queryGraphQL(query) {
  const res = await fetch(HIGHLIGHT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  return (await res.json()).data;
}

async function waitForIndexing(query, check, label, maxWait = 30000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    const data = await queryGraphQL(query);
    if (check(data)) return data;
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error(`Timed out waiting for: ${label}`);
}

async function fundPosterWallet() {
  // Fund the Mana poster wallet so it can send txs
  const posterAddress = '0xDE59CBa61faFBDb557De255eC6FB90182C7b488B';
  console.log(`Funding poster wallet ${posterAddress}...`);

  const tx = await wallet.sendTransaction({
    to: posterAddress,
    value: '0x' + (10n * 10n**18n).toString(16), // 10 ETH
  });
  await tx.wait();
  console.log('  Funded with 10 ETH');
}

// ---- Tests ----

async function testCreateSpace() {
  console.log('\n1. CreateSpace');
  const before = await queryGraphQL('{ spaces { id } }');
  const countBefore = before.spaces.length;

  const envelope = await signEnvelope('CreateSpace', { CreateSpace: [] }, {});
  const result = await sendToMana(envelope);
  console.log('  Tx hash:', result.hash);

  const data = await waitForIndexing(
    '{ spaces { id owner } }',
    d => d.spaces.length > countBefore,
    'space to appear'
  );
  const newSpace = data.spaces[data.spaces.length - 1];
  console.log('  Space created:', newSpace);
  return newSpace;
}

async function testCreateRole(spaceId) {
  console.log('\n2. CreateRole (admin)');
  const envelope = await signEnvelope(
    'CreateRole',
    { CreateRole: [
      { name: 'space', type: 'uint64' },
      { name: 'permissionLevel', type: 'uint64' },
      { name: 'metadataUri', type: 'string' },
    ]},
    { space: parseInt(spaceId), permissionLevel: 1, metadataUri: 'ipfs://test-role' }
  );
  const result = await sendToMana(envelope);
  console.log('  Tx hash:', result.hash);

  const data = await waitForIndexing(
    '{ roles { id isAdmin } }',
    d => d.roles.length > 0,
    'role to appear'
  );
  console.log('  Role created:', data.roles[0]);
  return data.roles[0];
}

async function testClaimRole(spaceId, roleId) {
  console.log('\n3. ClaimRole');
  const envelope = await signEnvelope(
    'ClaimRole',
    { ClaimRole: [
      { name: 'space', type: 'uint64' },
      { name: 'id', type: 'uint64' },
    ]},
    { space: parseInt(spaceId), id: parseInt(roleId) }
  );
  const result = await sendToMana(envelope);
  console.log('  Tx hash:', result.hash);

  const data = await waitForIndexing(
    '{ userroles { id } }',
    d => d.userroles.length > 0,
    'userrole to appear'
  );
  console.log('  Role claimed:', data.userroles[0]);
}

async function testCreateTopic(spaceId) {
  console.log('\n4. CreateTopic');
  const envelope = await signEnvelope(
    'Topic',
    { Topic: [
      { name: 'space', type: 'uint64' },
      { name: 'category', type: 'uint64' },
      { name: 'metadataUri', type: 'string' },
    ]},
    { space: parseInt(spaceId), category: 0, metadataUri: 'ipfs://test-topic' }
  );
  const result = await sendToMana(envelope);
  console.log('  Tx hash:', result.hash);

  const data = await waitForIndexing(
    '{ topics { id title topic_id } }',
    d => d.topics.length > 0,
    'topic to appear'
  );
  console.log('  Topic created:', data.topics[0]);
  return data.topics[0];
}

async function testCreatePost(spaceId, topicNum) {
  console.log('\n5. CreatePost');
  const envelope = await signEnvelope(
    'Post',
    { Post: [
      { name: 'space', type: 'uint64' },
      { name: 'topic', type: 'uint64' },
      { name: 'metadataUri', type: 'string' },
    ]},
    { space: parseInt(spaceId), topic: parseInt(topicNum), metadataUri: 'ipfs://test-post' }
  );
  const result = await sendToMana(envelope);
  console.log('  Tx hash:', result.hash);

  const data = await waitForIndexing(
    '{ posts { id post_id body } }',
    d => d.posts.length > 0,
    'post to appear'
  );
  console.log('  Post created:', data.posts[0]);
  return data.posts[0];
}

async function testVote(spaceId, topicNum, postNum) {
  console.log('\n6. Vote');
  const envelope = await signEnvelope(
    'Vote',
    { Vote: [
      { name: 'space', type: 'uint64' },
      { name: 'topic', type: 'uint64' },
      { name: 'post', type: 'uint64' },
      { name: 'choice', type: 'uint64' },
    ]},
    { space: parseInt(spaceId), topic: parseInt(topicNum), post: parseInt(postNum), choice: 1 }
  );
  const result = await sendToMana(envelope);
  console.log('  Tx hash:', result.hash);

  const data = await waitForIndexing(
    '{ votes { id choice voter } }',
    d => d.votes.length > 0,
    'vote to appear'
  );
  console.log('  Vote recorded:', data.votes[0]);
}

async function testDoubleVote(spaceId, topicNum, postNum) {
  console.log('\n7. Double vote (should be rejected)');
  const envelope = await signEnvelope(
    'Vote',
    { Vote: [
      { name: 'space', type: 'uint64' },
      { name: 'topic', type: 'uint64' },
      { name: 'post', type: 'uint64' },
      { name: 'choice', type: 'uint64' },
    ]},
    { space: parseInt(spaceId), topic: parseInt(topicNum), post: parseInt(postNum), choice: 2 }
  );
  const result = await sendToMana(envelope);
  console.log('  Tx hash:', result.hash);

  // Wait a bit for indexing, then verify still only 1 vote
  await new Promise(r => setTimeout(r, 5000));
  const data = await queryGraphQL('{ votes { id choice voter } }');
  if (data.votes.length === 1) {
    console.log('  PASS: Double vote was correctly rejected');
  } else {
    console.log('  FAIL: Expected 1 vote, got', data.votes.length);
  }
}

// ---- Main ----

async function main() {
  console.log('=== Townhall E2E Test ===');
  console.log('Signer:', await wallet.getAddress());

  await fundPosterWallet();

  const space = await testCreateSpace();
  const role = await testCreateRole(space.id);
  await testClaimRole(space.id, role.id);
  const topic = await testCreateTopic(space.id);
  const post = await testCreatePost(space.id, topic.topic_id);
  await testVote(space.id, topic.topic_id, post.post_id);
  await testDoubleVote(space.id, topic.topic_id, post.post_id);

  console.log('\n=== All tests passed! ===');
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
