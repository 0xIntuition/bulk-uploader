import { gql, GraphQLClient } from 'graphql-request';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.API_URL) {
  throw new Error('API_URL is not set');
}

const apiUrl = process.env.API_URL;

const client = new GraphQLClient(apiUrl);


const positionsCountQuery = gql`
query PositionsCount($address: String!) {
  positions_aggregate(where: { account_id: { _eq: $address } }) {
    aggregate {
      count
    }
  }
}
`;

const positionsQuery = gql`
query Positions($address: String!, $limit: Int, $offset: Int) {
  positions(
    limit: $limit
    offset: $offset
    where: { account_id: { _eq: $address } }
  ) {
    shares
    term {
      id
      atom {
        term_id
        label
        type
        data
      }
      triple {
        subject {
          term_id
          label
          type
          data
        }
        predicate {
          term_id
          label
          type
          data
        }
        object {
          term_id
          label
          type
          data
        }
      }
    }
  }
}
`;

interface PositionsResult {
  positions: {
    shares: number;
    term: {
      id: string;
      atom?: {
        term_id: string;
        label: string;
        type: string;
        data: string;
      };
      triple?: {
        subject: {
          term_id: string;
          label: string;
          type: string;
          data: string;
        };
        predicate: {
          term_id: string;
          label: string;
          type: string;
          data: string;
        };
        object: {
          term_id: string;
          label: string;
          type: string;
          data: string;
        };
      };
    };
  }[];
}

export const getPositions = async (address: string) => {
  // loop through all pages
  let offset = 0;
  const result: PositionsResult['positions'] = [];
  let hasMore = true;

  const { positions_aggregate } = await client.request<{ positions_aggregate: { aggregate: { count: number } } }>(positionsCountQuery, { address });
  const totalCount = positions_aggregate.aggregate.count;
  console.log('totalCount', totalCount);

  while (hasMore) {
    const { positions } = await client.request<PositionsResult>(positionsQuery, { address, limit: 100, offset });
    result.push(...positions);
    hasMore = totalCount > result.length;
    offset += 100;
    console.log('progress', result.length, '/', totalCount, '(', Math.round((result.length / totalCount) * 100), '%)');
  }

  return result;
};