import { gql, GraphQLClient } from 'graphql-request';
import { formatDuration, formatRelative, formatDistanceToNow } from 'date-fns';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.API_URL) {
  throw new Error('API_URL is not set');
}

const apiUrl = process.env.API_URL;

const client = new GraphQLClient(apiUrl);


const positionsCountQuery = gql`
query PositionsCount($where: positions_bool_exp) {
  positions_aggregate(where: $where) {
    aggregate {
      count
    }
  }
}
`;

const positionsQuery = gql`
query Positions($limit: Int, $offset: Int, $where: positions_bool_exp) {
  positions(
    limit: $limit
    offset: $offset
    where: $where ) {
    shares
    account_id
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

export interface PositionsResult {
  positions: {
    shares: number;
    account_id: string;
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

export const syncPositions = async (callback?: (positions: PositionsResult['positions']) => Promise<void>, address?: string) => {
  // loop through all pages
  let offset = 0;
  let hasMore = true;
  const startTime = Date.now();

  const { positions_aggregate } = await client.request<{ positions_aggregate: { aggregate: { count: number } } }>(positionsCountQuery, { where: address ? { account_id: { _eq: address } } : undefined });
  const totalCount = positions_aggregate.aggregate.count;
  console.log('totalCount', totalCount);
  let processedCount = 0;
  let loopStartTime = Date.now();

  while (hasMore) {
    console.time('getPositions');
    const { positions } = await client.request<PositionsResult>(positionsQuery, { where: address ? { account_id: { _eq: address } } : undefined, limit: 100, offset });
    console.timeEnd('getPositions');
    hasMore = processedCount < totalCount;
    offset += 100;

    const loopDuration = Date.now() - loopStartTime;
    const avgLoopTime = (Date.now() - startTime) / (processedCount / 100 || 1);
    const remainingLoops = Math.ceil((totalCount - processedCount) / 100);
    const estimatedEndTime = new Date(Date.now() + (avgLoopTime * remainingLoops));
    console.log('progress', processedCount, '/', totalCount, '(', Math.round((processedCount / totalCount) * 100), '%)');
    console.log('loop duration:', formatDuration({ seconds: Math.max(1, Math.floor(loopDuration / 1000)) }));
    if (isNaN(estimatedEndTime.getTime())) {
      console.log('estimated completion: calculating...');
    } else {
      console.log('estimated completion in', formatDistanceToNow(estimatedEndTime));
    }

    console.time('savePositions');
    await callback?.(positions);
    processedCount += positions.length;
    console.timeEnd('savePositions');

    loopStartTime = Date.now();
  }

};


const atomsByDataQuery = gql`
query atomByData ($data: String!) {
  atoms(where: {data: {_eq: $data}}) {
    term_id
  }
}
`;

export const getAtomByData = async (data: string) => {
  const { atoms } = await client.request<{ atoms: { term_id: string }[] }>(atomsByDataQuery, { data });
  return atoms[0]?.term_id;
};