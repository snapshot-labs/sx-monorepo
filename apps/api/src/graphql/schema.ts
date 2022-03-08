export default `
type Query {
  checkpoint(where: Where): [Checkpoint]

  proposals(where: Where): [Proposal]

  votes(where: Where): [Vote]
}

input Where {
  created: Int
}

type Checkpoint {
  number: Int!
}

type Proposal {
  id: Int!
  space: String!
  author: String!
  title: String
  body: String
  start: Int!
  end: Int!
  snapshot: Int
  created: Int!
  tx: String!
}

type Vote {
  id: String!
  voter: String
  proposal: String
  choice: Int
  created: Int
}
`;
