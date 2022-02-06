export default `
type Query {
  proposals(where: Where): [Proposal]

  votes(where: Where): [Vote]
}

input Where {
  created: Int
}

type Proposal {
  id: String!
  author: String
  created: Int
}

type Vote {
  id: String!
  voter: String
  proposal: String
  choice: Int
  created: Int
}
`;
