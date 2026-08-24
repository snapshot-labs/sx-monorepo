import { Proposal, Vote } from '../clients/hub';
import { BODY_LIMIT, HISTORY_LIMIT } from '../config';
import { AGENT_CONTEXT } from '../context';

function cut(text: string, limit: number): string {
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}

export function stripHidden(body: string): string {
  return body.replace(/<!--[\s\S]*?-->/g, '').trim();
}

/**
 * Keeps text written by strangers from closing one of our tags early and
 * passing itself off as another part of the prompt. Only tag-like `<` is
 * escaped, so `a < b` survives.
 */
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
  return proposal.choices.map(choice => `- ${choice}`).join('\n');
}

export function renderChoice(proposal: Proposal, choice: number): string {
  return proposal.choices[choice - 1] ?? `#${choice}`;
}

function renderProposal(proposal: Proposal): string {
  return [
    `<title>${clean(proposal.title)}</title>`,
    `<ends>${day(proposal.end)}</ends>`,
    '<body>',
    cut(clean(proposal.body), BODY_LIMIT),
    '</body>',
    '<options>',
    renderOptions(proposal),
    '</options>'
  ].join('\n');
}

export function buildProposals(target: Proposal, past: Proposal[]): string {
  const older = [...past]
    .sort((a, b) => b.end - a.end)
    .map(
      (proposal, index) =>
        `<proposal index="${index + 1}">\n${renderProposal(proposal)}\n</proposal>`
    )
    .join('\n');

  return [
    `<proposals space="${target.space.id}">`,
    '<open_proposal>',
    renderProposal(target),
    '</open_proposal>',
    '<past_proposals>',
    older,
    '</past_proposals>',
    '</proposals>'
  ].join('\n');
}

export function buildVoterHistory(
  voter: string,
  votes: Vote[],
  proposals: Map<string, Proposal>
): string {
  const entries = votes
    .slice(0, HISTORY_LIMIT)
    .map(vote => {
      const proposal = proposals.get(vote.proposal.id);
      if (!proposal) return null;

      const reason = vote.reason.trim();

      return [
        '<vote>',
        `<date>${day(vote.created)}</date>`,
        `<proposal>${clean(proposal.title)}</proposal>`,
        `<choice>${renderChoice(proposal, vote.choice)}</choice>`,
        reason ? `<reason>${cut(clean(reason), 500)}</reason>` : null,
        '</vote>'
      ]
        .filter(line => line !== null)
        .join('\n');
    })
    .filter(entry => entry !== null);

  return [
    `<voter_votes voter="${voter}">`,
    entries.join('\n'),
    '</voter_votes>'
  ].join('\n');
}

export function buildInstructions(): string {
  return ['<voter_instructions>', AGENT_CONTEXT, '</voter_instructions>'].join(
    '\n'
  );
}
