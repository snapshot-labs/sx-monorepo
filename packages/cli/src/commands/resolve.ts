import { lookupAddress, resolveName } from '../stamp.js';

const HEX_ADDRESS = /^0x[0-9a-fA-F]{40}$/;

export async function resolve(input: string): Promise<void> {
  if (HEX_ADDRESS.test(input)) {
    const name = await lookupAddress(input);
    console.log(JSON.stringify({ address: input.toLowerCase(), name }, null, 2));
    return;
  }
  const address = await resolveName(input);
  console.log(
    JSON.stringify(
      { name: input, address: address?.toLowerCase() ?? null },
      null,
      2
    )
  );
}
