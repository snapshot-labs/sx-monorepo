import { gql } from './gql';

gql(`
  query Referees($tag: String!, $first: Int!, $skip: Int!) {
    referees(
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
  query UserReferral($id: String!) {
    referral(id: $id) {
      id
      tag
      referral
      referee
      created
    }
  }
`);
