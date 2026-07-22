module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    // .claude/worktrees/ holds Claude Code harness worktrees that clone this
    // repo (including test files); Jest recurses into them by default and
    // double-runs the suite. Excluding the directory keeps `npm test`
    // reproducible across environments that mount .claude/ and those that
    // don't.
    testPathIgnorePatterns: ['/node_modules/', '/\\.claude/'],
};
