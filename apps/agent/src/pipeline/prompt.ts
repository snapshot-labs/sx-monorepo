import { Proposal } from '../clients/hub';
import { BODY_LIMIT } from '../config';

function cut(text: string, limit: number): string {
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}

export function stripHidden(body: string): string {
  return body.replace(/<!--[\s\S]*?-->/g, '').trim();
}

export function escapeTags(text: string): string {
  return text.replace(/<(?=\/?[a-zA-Z_])/g, '&lt;');
}

function clean(text: string): string {
  return escapeTags(stripHidden(text));
}

function day(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString().slice(0, 10);
}

export function renderOptions(proposal: Proposal): string {
  return proposal.choices
    .map((choice, index) => `${index + 1}. ${clean(choice)}`)
    .join('\n');
}

export function buildProposal(proposal: Proposal): string {
  return [
    `<proposal space="${proposal.space.id}">`,
    `<title>${clean(proposal.title)}</title>`,
    `<ends>${day(proposal.end)}</ends>`,
    '<body>',
    cut(clean(proposal.body), BODY_LIMIT),
    '</body>',
    '<options>',
    renderOptions(proposal),
    '</options>',
    '</proposal>'
  ].join('\n');
}

export function buildInstructions(context: string): string {
  return [
    '<voter_instructions>',
    escapeTags(context),
    '</voter_instructions>'
  ].join('\n');
}
