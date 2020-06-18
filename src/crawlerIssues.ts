import { RequestParameters } from '@octokit/graphql/dist-types/types';
import cli from 'cli-ux';
import { isString } from 'lodash';
import { Repository, Statistic, fetchFromGithub, writeJsonFile } from './utils';

export const writeIssues = async (
  headers: RequestParameters,
  repository: Repository
): Promise<Partial<Statistic>> => {
  let hasPreviousPage = true;
  let startCursor = undefined;
  let issuesCount = 0;
  let issuesSizeInBytes = 0;

  const progressBar = cli.progress({
    format: 'Fetching issues | {bar} | {value}/{total} new issues',
  });

  while (hasPreviousPage) {
    const response: any = await fetchIssues(headers, startCursor);
    if (isString(response)) {
      progressBar.stop();
      return {
        issuesCount,
        issuesSizeInBytes,
        errorMessage: response as string,
      };
    }

    const issues = (response?.nodes as any[]) || [];
    hasPreviousPage = response?.pageInfo?.hasPreviousPage;
    startCursor = response?.pageInfo?.startCursor;

    if (issuesCount === 0) {
      progressBar.start(response.totalCount);
    }

    const sizes = await Promise.all(
      issues.map(x =>
        writeJsonFile('issues', x.number + '.json', x, repository)
      )
    );
    issuesSizeInBytes = sizes.reduce((x, y) => x + y, issuesSizeInBytes);

    issuesCount += issues.length;
    progressBar.increment(issues.length);
  }

  progressBar.stop();
  return { issuesCount, issuesSizeInBytes };
};

/**
 * Fetch the last 100 issues.
 * You can paginate through the issues with the `startCursor`.
 * Pagination for issue comments is not supported now, so you can just fetch the last 100 comments.
 */
export const fetchIssues = async (
  headers: RequestParameters,
  startCursor: string | undefined
): Promise<any> => {
  const response = await fetchFromGithub(
    `
        query lastIssues(
          $owner: String!
          $name: String!
          $startCursor: String
        ) {
          repository(owner: $owner, name: $name) {
            issues(
              last: 100
              orderBy: { field: UPDATED_AT, direction: DESC }
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
  return response.repository.issues;
};
