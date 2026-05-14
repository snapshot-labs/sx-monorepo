import snapshot from '@snapshot-labs/snapshot.js';
import { VariableType } from 'json-to-graphql-query';
import { Provider } from './Provider';
import { Delegate } from '../';

const QUERY = {
  __variables: {
    orderBy: 'DelegatesOrder!',
    seed: 'String!',
    statement: 'StatementFilter',
    first: 'Int!'
  },
  delegates: {
    __args: {
      first: new VariableType('first'),
      seed: new VariableType('seed'),
      orderBy: new VariableType('orderBy'),
      where: { statement: new VariableType('statement') }
    },
    edges: {
      node: {
        id: true,
        address: {
          resolvedName: {
            address: true,
            name: true
          }
        },
        statement: {
          summary: true,
          twitter: true,
          discord: true
        }
      },
      cursor: true
    },
    pageInfo: {
      endCursor: true,
      hasNextPage: true
    }
  }
};

export default class Agora extends Provider {
  static readonly MAPPING = {
    // NOTE: disabling pages not using graphql api
    // 's:ens.eth': 'https://agora.ensdao.org',
    // 's:opcollective.eth': 'https://vote.optimism.io',
    // 's:uniswapgovernance.eth': 'https://vote.uniswapfoundation.org',
    's:lyra.eth': 'https://vote.lyra.finance'
  };

  static readonly ID = 'agora';

  async _fetch() {
    const page = 0;
    const variables = {
      orderBy: 'mostVotingPower',
      statement: 'withStatement',
      seed: Date.now().toString(),
      first: 30
    };

    this.beforeFetchPage(page);

    const results = await snapshot.utils.subgraphRequest(
      `${Agora.MAPPING[this.spaceId]}/graphql`,
      QUERY,
      {
        variables
      }
    );

    const _delegates: Delegate[] = results.delegates.edges.map((edge: any) => {
      return this.formatDelegate({
        delegate: edge.node.address.resolvedName.address,
        statement: edge.node.statement.summary.trim()
      });
    });

    await this.afterFetchPage(page, _delegates);
  }

  getId(): string {
    return Agora.ID;
  }
}
