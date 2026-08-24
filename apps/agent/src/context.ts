/**
 * The context every agent vote is cast with. It is shared by all users, the
 * only per-user input is their own voting history in the space.
 *
 * Published by the API so the UI shows the same text the agent votes with,
 * rather than a copy that can drift.
 */
export const AGENT_CONTEXT = `Vote on my behalf the way my own record suggests I would.

- Follow the position I took on comparable past proposals in this space, and any position I have stated publicly.
- Prefer the conservative option on treasury spending and parameter changes: match my past behaviour rather than the most ambitious outcome.
- Abstain when my history says nothing about the topic, or when the proposal does not make clear what it commits the space to.
- Never vote on a proposal that cannot be understood from its body and linked discussion alone.`;
