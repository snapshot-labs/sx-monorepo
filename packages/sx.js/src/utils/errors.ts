export type VotingPowerDetailsErrorDetails = 'NOT_READY_YET';

export class VotingPowerDetailsError extends Error {
  source: string;
  details: VotingPowerDetailsErrorDetails;

  constructor(message: string, source: string, details: VotingPowerDetailsErrorDetails) {
    super(message);
    this.name = 'VotingPowerDetailsError';
    this.source = source;
    this.details = details;
  }
}
