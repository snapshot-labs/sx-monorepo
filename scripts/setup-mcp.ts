import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const ONBOARIDNG_URL =
  'chrome-extension://hebhblbkkdabgoldnojllkipeoacjioc/home.html';

const transport = new StdioClientTransport({
  command: 'npx',
  args: ['@playwright/mcp@latest', '--config=./playwright-mcp-config.json']
});

const client = new Client({
  name: 'setup-client',
  version: '1.0.0'
});

async function main() {
  console.log('Now browser will open, please restore your wallet.');
  console.log('USE THE SAME PASSWORD AS PROVIDED BEFORE.');
  console.log('After restoring your wallet, Ctrl+C to stop the script.');

  await client.connect(transport);

  await client.callTool({
    name: 'browser_navigate',
    arguments: {
      url: ONBOARIDNG_URL
    }
  });
}

main();
