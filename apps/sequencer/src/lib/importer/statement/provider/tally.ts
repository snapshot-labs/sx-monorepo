import snapshot from '@snapshot-labs/snapshot.js';
import { VariableType } from 'json-to-graphql-query';
import { Provider } from './Provider';
import { Delegate } from '../';

const API_URL = 'https://api.tally.xyz/query';

const DELEGATES_QUERY = {
  __variables: {
    input: 'DelegatesInput!'
  },
  delegates: {
    __args: {
      input: new VariableType('input')
    },
    nodes: {
      __on: {
        __typeName: 'Delegate',
        id: true,
        account: {
          address: true
        },
        statement: {
          statement: true
        }
      }
    },
    pageInfo: {
      firstCursor: true,
      lastCursor: true
    }
  }
};

const ORGANIZATION_QUERY = {
  __variables: {
    input: 'OrganizationInput!'
  },
  organization: {
    __args: {
      input: new VariableType('input')
    },
    governorIds: true,
    id: true
  }
};

export default class Tally extends Provider {
  static readonly MAPPING = {
    's:arbitrumfoundation.eth': 'arbitrum',
    'arb1:0x789fC99093B09aD01C34DC7251D0C89ce743e5a4': 'arbitrum',
    's:uniswapgovernance.eth': 'uniswap',
    's:dopedao.eth': 'dopewars',
    's:opcollective.eth': 'optimism',
    's:ens.eth': 'ens',
    's:aave.eth': 'aave',
    's:gitcoindao.eth': 'gitcoin',
    's:hop.eth': 'hop',
    's:gmx.eth': 'gmx',
    's:yam.eth': 'yam-finance',
    's:idlefinance.eth': 'idle'
    // Spaces below do not have delegates with statement
    // 's:fei.eth': 'fei',
    // 's:eulerdao.eth': 'euler',
    // 's:fuse.eth': 'rari-capital',
    // 's:truefigov.eth': 'truefi',
    // 's:instadapp-gov.eth': 'instadapp'
    // 's:anglegovernance.eth': 'angle'
  };

  static readonly ID = 'tally';

  throttle_interval = 750;

  async _fetch() {
    const spaceMeta = await this.spaceMeta();

    let afterCursor: string | undefined;
    let page = 0;

    while (true) {
      this.beforeFetchPage(page);

      const variables: Record<string, any> = {
        input: {
          filters: {
            governorId: spaceMeta.governorId,
            organizationId: spaceMeta.organizationId
          },
          sort: {
            isDescending: true,
            sortBy: 'votes'
          },
          page: {
            limit: 20
          }
        }
      };

      if (afterCursor) variables.input.page.afterCursor = afterCursor;

      const results = await snapshot.utils.subgraphRequest(
        API_URL,
        DELEGATES_QUERY,
        {
          variables,
          headers: { 'Api-Key': process.env.TALLY_API_KEY }
        }
      );

      if (!results.delegates.nodes.length) break;

      const _delegates: Delegate[] = [];
      results.delegates.nodes.forEach((node: any) => {
        const statement = node.statement?.statement?.trim();

        if (!statement) return;

        _delegates.push(
          this.formatDelegate({
            delegate: node.account.address,
            statement
          })
        );
      });

      if (!results.delegates.pageInfo.lastCursor) break;

      afterCursor = results.delegates.pageInfo.lastCursor;
      page++;

      await this.afterFetchPage(page, _delegates);
    }
  }

  private async spaceMeta(): Promise<{
    governorId: string;
    organizationId: string;
  }> {
    const variables = {
      input: {
        slug: Tally.MAPPING[this.spaceId]
      }
    };

    const result = await snapshot.utils.subgraphRequest(
      API_URL,
      ORGANIZATION_QUERY,
      {
        variables,
        headers: { 'Api-Key': process.env.TALLY_API_KEY }
      }
    );

    return {
      organizationId: result.organization.id,
      governorId: result.organization.governorIds[0]
    };
  }

  getId(): string {
    return Tally.ID;
  }
}
