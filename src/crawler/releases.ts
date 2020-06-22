import { RequestParameters } from '@octokit/graphql/dist-types/types';
import { Repository, writeItems, ItemsStatistic } from '../utils';

export const writeReleases = async (
  headers: RequestParameters,
  repository: Repository
): Promise<ItemsStatistic> => {
  const query = `
  query releases($owner: String!, $name: String!, $startCursor: String) {
    repository(owner: $owner, name: $name) {
      releases(last: 100, orderBy: {field: CREATED_AT, direction: ASC}, before: $startCursor) {
        totalCount
        nodes {
          id
          createdAt
          updatedAt
          description
          name
          tagName
          url
          author {
            avatarUrl(size: 160)
            login
            url
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
    'releases',
    x => x.tagName + '.json',
    query,
    'createdAt',
    headers,
    repository
  );
};
