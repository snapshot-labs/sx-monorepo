export default `
type Query {
  votes(where: Where): [Vote]
}

type Vote {
  voter: String
  proposal: String
  choice: Int
}
`;
