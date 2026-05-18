import { getQuorum } from '../src/helpers/utils';

getQuorum(
  {
    strategy: 'static',
    quorumModifier: 1,
    total: 8767
  },
  '137',
  10
)
  .then(console.log)
  .catch(console.error)
  .finally(() => process.exit(0));
