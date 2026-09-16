module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // .claude/worktrees/ holds Claude Code harness worktrees that clone this
  // repo (including test files); Jest recurses into them by default and
  // double-runs the suite.
  testPathIgnorePatterns: ['/node_modules/', '/\\.claude/'],
  // The BLS12-381 vectors run real curve arithmetic; the flow vector alone
  // verifies five ballots at budget 100.
  testTimeout: 120_000
};
