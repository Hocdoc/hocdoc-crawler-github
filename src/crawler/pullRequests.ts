import { RequestParameters } from '@octokit/graphql/dist-types/types';
import { Repository, writeItems, ItemsStatistic } from '../utils';

export const writePullRequests = async (
  headers: RequestParameters,
  repository: Repository
): Promise<ItemsStatistic> => {
  const query = `
  query pullRequests($owner: String!, $name: String!, $startCursor: String) {
    repository(owner: $owner, name: $name) {
      pullRequests(last: 100, orderBy: {field: UPDATED_AT, direction: DESC}, before: $startCursor) {
        totalCount
        nodes {
          id
          number
          additions
          body
          url
          updatedAt
          title
          author {
            avatarUrl(size: 160)
            login
            url
          }
          comments(last: 100) {
            nodes {
              body
              createdAt
              url
            }
          }
          labels(last: 100) {
            nodes {
              name
            }
          }
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
    'pullRequests',
    x => x.number + '.json',
    query,
    headers,
    repository
  );
};
