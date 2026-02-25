import { gql } from './gql';

gql(`
  query PartnerStatistics($indexer: String!, $tag: String!, $first: Int!, $skip: Int!) {
    partnerstatistics(
      indexer: $indexer
      where: { tag: $tag }
      first: $first
      skip: $skip
      orderBy: buyer_count
      orderDirection: desc
    ) {
      id
      tag
      partner
      buyer_count
    }
  }
`);

gql(`
  query UserInvite($indexer: String!, $id: String!) {
    invite(indexer: $indexer, id: $id) {
      id
      tag
      partner
      buyer
      created
    }
  }
`);

gql(`
  query UserInvites($indexer: String!, $tag: String!, $partner: String!, $first: Int!, $skip: Int!) {
    invites(indexer: $indexer, first: $first, skip: $skip, where: { tag: $tag, partner: $partner }) {
      id
      tag
      partner
      buyer
      created
    }
  }
`);
