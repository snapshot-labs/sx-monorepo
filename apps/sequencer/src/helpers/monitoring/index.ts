import { scan } from './chainpatrol';
import { monitoringBlockedRequestsCount } from '../metrics';

function extractUrls(text: string): string[] {
  return (
    text.match(/(?:https?:\/\/)?[^\s<>()]+?\.[a-zA-Z]{2,}(?:\/[^\s<>()]*)?/g) ||
    []
  );
}

export async function isMalicious(
  proposal: any,
  space: 'string'
): Promise<boolean> {
  const content = `
      ${proposal.name || ''}
      ${proposal.body || ''}
      ${proposal.discussion || ''}
    `;
  const urls = extractUrls(content);
  const results = await Promise.all(urls.map(url => scan(url)));
  const maliciousLinkFound = results.some(result => result.is_malicious);
  if (maliciousLinkFound) {
    monitoringBlockedRequestsCount.inc({ space, service: 'chainpatrol' });
  }
  return maliciousLinkFound;
}
