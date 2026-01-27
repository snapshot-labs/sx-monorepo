// Quick test to verify registry lookup
const SNAPSHOT_ID = '0x57853565aa27e14788f9533e9b788b20473b4e81711a16bef0b7210e3fa8a900';

fetch('https://d3ugkaojqkfud0.cloudfront.net/subgraphs/name/futarchy-complete-new-v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        query: `{ 
            metadataEntries(where: { 
                key: "${SNAPSHOT_ID.toLowerCase()}", 
                organization_: { aggregator: "0xc5eb43d53e2fe5fdde5faf400cc4167e5b5d4fc1" } 
            }) { 
                key 
                value 
                organization { name } 
            } 
        }`
    })
}).then(r => r.json()).then(d => {
    console.log('Result:', JSON.stringify(d, null, 2));
    if (d.data?.metadataEntries?.length > 0) {
        console.log('\n✅ Found! Futarchy ID:', d.data.metadataEntries[0].value);
    } else {
        console.log('\n⚠️ Not found yet');
    }
});
