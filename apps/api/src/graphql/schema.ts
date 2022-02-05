export default `
type Query {
  votes(where: Where): [Vote]
}

input Where {
  voter: String
  proposal: String
  choice: Int
}

type Vote {
  voter: String
  proposal: String
  choice: Int
}
`;
