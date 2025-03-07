export interface Discussion {
  id: number;
  author: string;
  title: string;
  body: string;
  statement_count: number;
  vote_count: number;
  created: number;
  statements: Statement[];
}

export interface Statement {
  id: string;
  body: string;
  scores_1: number;
  scores_2: number;
  scores_3: number;
  vote_count: number;
  created: number;
  discussion_id: number;
  statement_id: number;
  discussion: {
    id: number;
  };
}

export interface Vote {
  id: string;
  voter: string;
  choice: number;
  created: number;
  discussion_id: number;
  statement_id: number;
  discussion: { id: number };
  statement: { id: number };
}
