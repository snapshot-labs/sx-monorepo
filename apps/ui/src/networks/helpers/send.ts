export async function send(
  client: { send: (envelope: any) => Promise<any> },
  envelope: any
) {
  return client.send(envelope);
}
