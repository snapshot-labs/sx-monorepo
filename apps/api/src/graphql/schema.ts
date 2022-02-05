export default `
type Query {
  votes: [Vote]
}

type Vote {
  voter: String
  proposal: String
  choice: Int
}
`;
