/**
 * Test script to verify Futarchy Registry V2 lookup
 */

const FUTARCHY_REGISTRY_ENDPOINT = 'https://d3ugkaojqkfud0.cloudfront.net/subgraphs/name/futarchy-complete-new-v2';
const AGGREGATOR_ADDRESS = '0xc5eb43d53e2fe5fdde5faf400cc4167e5b5d4fc1';

// Test Snapshot proposal ID (Kleros KIP-81)
const TEST_SNAPSHOT_ID = '0x57853565aa27e14788f9533e9b788b20473b4e81711a16bef0b7210e3fa8a900';

async function testRegistryLookup(snapshotProposalId) {
    const normalizedId = snapshotProposalId.toLowerCase();

    console.log(`\n=== Testing Registry Lookup ===`);
    console.log(`Snapshot ID: ${normalizedId}`);
    console.log(`Aggregator: ${AGGREGATOR_ADDRESS}`);
    console.log(`Endpoint: ${FUTARCHY_REGISTRY_ENDPOINT}\n`);

    const query = `{
        metadataEntries(where: { 
            key: "${normalizedId}",
            organization_: { aggregator: "${AGGREGATOR_ADDRESS}" }
        }) {
            key
            value
            organization { 
                id 
                name
                description
            }
        }
    }`;

    try {
        const response = await fetch(FUTARCHY_REGISTRY_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });

        const data = await response.json();

        console.log('Response:', JSON.stringify(data, null, 2));

        if (data.data?.metadataEntries?.length > 0) {
            const entry = data.data.metadataEntries[0];
            console.log(`\n✅ Found mapping:`);
            console.log(`   Organization: ${entry.organization?.name}`);
            console.log(`   Key: ${entry.key}`);
            console.log(`   Value (Futarchy ID): ${entry.value}`);
            return entry.value;
        } else {
            console.log(`\n⚠️ No mapping found for this proposal ID`);
            return null;
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        return null;
    }
}

// Also list all metadata entries for the aggregator
async function listAllMetadataEntries() {
    console.log(`\n=== All Metadata Entries in Aggregator ===\n`);

    const query = `{
        aggregator(id: "${AGGREGATOR_ADDRESS}") {
            id
            organizations {
                id
                name
                metadataEntries {
                    key
                    value
                }
            }
        }
    }`;

    try {
        const response = await fetch(FUTARCHY_REGISTRY_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });

        const data = await response.json();

        if (data.data?.aggregator?.organizations) {
            for (const org of data.data.aggregator.organizations) {
                console.log(`📁 ${org.name || org.id}`);
                for (const entry of org.metadataEntries || []) {
                    const keyShort = entry.key.length > 20 ? entry.key.slice(0, 20) + '...' : entry.key;
                    const valueShort = entry.value.length > 40 ? entry.value.slice(0, 40) + '...' : entry.value;
                    console.log(`   ${keyShort} → ${valueShort}`);
                }
            }
        } else {
            console.log('No organizations found in aggregator');
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

async function main() {
    await testRegistryLookup(TEST_SNAPSHOT_ID);
    await listAllMetadataEntries();
}

main().catch(console.error);
