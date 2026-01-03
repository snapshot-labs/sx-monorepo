import { gql } from './gql';

gql(`
  query Referees($indexer: String!, $tag: String!, $first: Int!, $skip: Int!) {
    referees(
      indexer: $indexer
      where: { tag: $tag }
      first: $first
      skip: $skip
      orderBy: referral_count
      orderDirection: desc
    ) {
      id
      tag
      referee
      referral_count
    }
  }
`);

gql(`
  query UserReferral($indexer: String!, $id: String!) {
    referral(indexer: $indexer, id: $id) {
      id
      tag
      referral
      referee
      created
    }
  }
`);
