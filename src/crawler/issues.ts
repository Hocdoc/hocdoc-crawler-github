import { RequestParameters } from '@octokit/graphql/dist-types/types';
import { Repository, writeItems, ItemsStatistic } from '../utils';

export const writeIssues = async (
  headers: RequestParameters,
  repository: Repository
): Promise<ItemsStatistic> => {
  const query = `
  query lastIssues(
    $owner: String!
    $name: String!
    $startCursor: String
  ) {
    repository(owner: $owner, name: $name) {
      issues(
        last: 100
        orderBy: { field: UPDATED_AT, direction: ASC }
        before: $startCursor
      ) {
        totalCount
        nodes {
          id
          number
          url
          createdAt
          updatedAt
          title
          body
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
              author {
                avatarUrl(size: 160)
                login
                url
              }
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
    'issues',
    x => x.number + '.json',
    query,
    'updatedAt',
    headers,
    repository
  );
};
