import { RequestParameters } from '@octokit/graphql/dist-types/types';
import { Repository, writeItems, ItemsStatistic } from '../utils';

export const writeMilestones = async (
  headers: RequestParameters,
  repository: Repository
): Promise<ItemsStatistic> => {
  const query = `
  query milestones($owner: String!, $name: String!, $startCursor: String) {
    repository(owner: $owner, name: $name) {
      milestones(last: 100, orderBy: {field: CREATED_AT, direction: ASC}, before: $startCursor) {
        totalCount
        nodes {
          createdAt
          closedAt
          closed
          creator {
            url
            login
            avatarUrl(size: 100)
          }
          description
          dueOn
          id
          number
          state
          title
          updatedAt
          url
          resourcePath
        }
        pageInfo {
          startCursor
          hasPreviousPage
        }
      }
    }
  }
  `;

  return writeItems(
    'milestones',
    x => x.number + '.json',
    query,
    'createdAt',
    headers,
    repository
  );
};
