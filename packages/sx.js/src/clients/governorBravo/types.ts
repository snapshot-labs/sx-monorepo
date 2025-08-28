type Execution = {
  to: string;
  value: string;
  data: string;
};

export type Propose = {
  spaceId: string;
  title: string;
  body: string;
  executions: Execution[];
};

export type Vote = {
  spaceId: string;
  proposalId: number;
  choice: 0 | 1 | 2;
  reason?: string;
};

export type Envelope<T extends Propose | Vote> = {
  data: T;
};
