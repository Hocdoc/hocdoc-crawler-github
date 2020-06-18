import { RequestParameters } from '@octokit/graphql/dist-types/types';
import cli from 'cli-ux';
import { isString } from 'lodash';
import { Repository, Statistic, fetchFromGithub, writeJsonFile } from './utils';

export const writePullrequests = async (
  headers: RequestParameters,
  repository: Repository
): Promise<Partial<Statistic>> => {
  let hasPreviousPage = true;
  let startCursor = undefined;
  let pullrequestsCount = 0;
  let pullrequestsSizeInBytes = 0;

  const progressBar = cli.progress({
    format: 'Fetching pullrequests | {bar} | {value}/{total} new issues',
  });

  while (hasPreviousPage) {
    const response: any = await fetchPullrequests(headers, startCursor);
    if (isString(response)) {
      progressBar.stop();
      return {
        pullrequestsCount,
        pullrequestsSizeInBytes,
        errorMessage: response as string,
      };
    }

    const pullrequests = (response?.nodes as any[]) || [];
    hasPreviousPage = response?.pageInfo?.hasPreviousPage;
    startCursor = response?.pageInfo?.startCursor;

    if (pullrequestsCount === 0) {
      progressBar.start(response.totalCount);
    }

    const sizes = await Promise.all(
      pullrequests.map(x =>
        writeJsonFile('pullrequests', x.number + '.json', x, repository)
      )
    );
    pullrequestsSizeInBytes = sizes.reduce(
      (x, y) => x + y,
      pullrequestsSizeInBytes
    );

    pullrequestsCount += pullrequests.length;
    progressBar.increment(pullrequests.length);
  }

  progressBar.stop();
  return { pullrequestsCount, pullrequestsSizeInBytes };
};

export const fetchPullrequests = async (
  headers: RequestParameters,
  startCursor: string | undefined
): Promise<any> => {
  const response = await fetchFromGithub(
    `
    query pullrequests($owner: String!, $name: String!, $startCursor: String) {
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
      `,
    headers,
    startCursor
  );

  return response.repository.pullRequests;
};
