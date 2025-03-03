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
  id: number;
  body: string;
  score_1: number;
  score_2: number;
  score_3: number;
  vote_count: number;
  created: number;
  discussion: Discussion;
}

export interface Vote {
  id: number;
  voter: string;
  discussion: Discussion;
  statement: Statement;
  choice: number;
  created: number;
}
