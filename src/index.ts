import { graphql } from '@octokit/graphql';
import { RequestParameters } from '@octokit/graphql/dist-types/types';
import cli from 'cli-ux';
import { promises as fs } from 'fs';
import { isString } from 'lodash';
import filesize from 'filesize';

export interface Repository {
  owner: string;
  name: string;
}

export interface Statistic {
  issuesCount: number;
  issuesSizeInBytes: number;
  errorMessage?: string;
}

export const writeProjectData = async (
  repository: Repository,
  accessToken: string
): Promise<Statistic> => {
  const startTimeMillis = Date.now();
  const headers = {
    owner: repository.owner,
    name: repository.name,
    headers: {
      authorization: accessToken,
    },
  };
  const issues = await writeIssues(headers);
  let result: Statistic = {
    issuesCount: issues.issuesCount || 0,
    issuesSizeInBytes: issues.issuesSizeInBytes || 0,
    errorMessage: issues.errorMessage,
  };

  const lastTime = Date.now() - startTimeMillis;
  console.log(
    `Fetched ${result.issuesCount} issues with ${filesize(
      result.issuesSizeInBytes
    )} in ${Math.round(lastTime / 1000)}s from https://github.com/${
      repository.owner
    }/${repository.name}`
  );

  return result;
};

export const writeIssues = async (
  headers: RequestParameters
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

    const sizes = await Promise.all(issues.map(x => writeIssue(x)));
    issuesSizeInBytes = sizes.reduce((x, y) => x + y, issuesSizeInBytes);

    issuesCount += issues.length;
    progressBar.increment(issues.length);
  }

  progressBar.stop();
  return { issuesCount, issuesSizeInBytes };
};

/** @return size of the JSON issue in bytes */
const writeIssue = async (issue: any): Promise<number> => {
  if (issue.id) {
    const content = JSON.stringify(issue, undefined, 2);
    const path = '/tmp/' + issue.id + '.json';
    await fs.writeFile(path, content);
    return content.length;
  }
  return 0;
};

export const fetchIssues = async (
  headers: RequestParameters,
  startCursor: string | undefined
): Promise<any> => {
  try {
    const result = await graphql(
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
                createdAt
                updatedAt
                title
                body
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
      { ...headers, startCursor }
    );

    return (result as any).repository.issues;
  } catch (error) {
    return graphqlErrorToMessage(error);
  }

  return {};
};

export const graphqlErrorToMessage = (error: any): string => {
  return error.toString();
};

export const writePullRequests = (repository: Repository): void => {
  // TODO
};
