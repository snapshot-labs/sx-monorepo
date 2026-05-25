#!/usr/bin/env bun
import { Command } from 'commander';
import pkg from '../package.json' with { type: 'json' };
import { follow, unfollow } from './commands/follow.js';
import { listProposals } from './commands/proposals.js';
import { propose } from './commands/propose.js';
import { resolve } from './commands/resolve.js';
import { searchSpaces, showSpace } from './commands/space.js';
import { vote } from './commands/vote.js';
import { whoami } from './commands/whoami.js';

const program = new Command()
  .name('snapshot')
  .version(pkg.version)
  .description('Snapshot governance CLI');

program
  .command('whoami')
  .description('Show the address resolved from $ALIAS_PRIVATE_KEY')
  .action(whoami);

program
  .command('resolve <name-or-address>')
  .description('Translate an ENS name to an address (or vice versa)')
  .action(resolve);

program
  .command('proposals')
  .description('List proposals')
  .option('-s, --space <id>', 'restrict to a space (e.g. ens.eth)')
  .option('--state <state>', 'pending | active | closed')
  .option('-n, --first <n>', 'page size (default 20)', v => parseInt(v, 10))
  .action(listProposals);

program
  .command('space <id>')
  .description('Show a space\'s configuration')
  .action(showSpace);

program
  .command('search <query>')
  .description('Search spaces by name')
  .action(searchSpaces);

program
  .command('vote <proposal> <choice>')
  .description('Cast a vote. Choice is a 1-based index, JSON array, or JSON object.')
  .option('-r, --reason <text>', 'vote reason')
  .action(vote);

program
  .command('propose <space> <title>')
  .description('Create a proposal')
  .option('-b, --body <text>', 'proposal body (markdown)')
  .option('--body-file <path>', 'read body from file')
  .option('-c, --choices <list>', 'comma-separated choices (defaults to For,Against,Abstain)')
  .option('-t, --type <type>', 'voting type (defaults to the space\'s enforced type)')
  .option('--discussion <url>', 'discussion link')
  .action(propose);

program
  .command('follow <space>')
  .description('Follow a space')
  .action(follow);

program
  .command('unfollow <space>')
  .description('Unfollow a space')
  .action(unfollow);

try {
  await program.parseAsync(process.argv);
} catch (e) {
  console.error(e instanceof Error ? e.message : String(e));
  process.exitCode = 1;
}
