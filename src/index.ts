import { graphql } from '@octokit/graphql';
import { RequestParameters } from '@octokit/graphql/dist-types/types';
import cli from 'cli-ux';
import { promises as fs } from 'fs';
import { isString } from 'lodash';
import filesize from 'filesize';
import path from 'path';

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
    ...repository,
    headers: {
      authorization: accessToken,
    },
  };
  await createDirectories(repository);
  const issues = await writeIssues(headers, repository);
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

    const sizes = await Promise.all(issues.map(x => writeIssue(x, repository)));
    issuesSizeInBytes = sizes.reduce((x, y) => x + y, issuesSizeInBytes);

    issuesCount += issues.length;
    progressBar.increment(issues.length);
  }

  progressBar.stop();
  return { issuesCount, issuesSizeInBytes };
};

const repositoryDestinationPath = (repository: Repository): string =>
  path.join('/tmp', repository.owner, repository.name);

const createDirectories = async (repository: Repository) => {
  const dirName = path.join(repositoryDestinationPath(repository), 'issues');
  return fs.mkdir(dirName, { recursive: true });
};

/** @return size of the JSON issue in bytes */
const writeIssue = async (
  issue: any,
  repository: Repository
): Promise<number> => {
  if (issue.number) {
    const content = JSON.stringify(issue, undefined, 2);
    const filepath = path.join(
      repositoryDestinationPath(repository),
      'issues',
      issue.number + '.json'
    );
    await fs.writeFile(filepath, content);
    return content.length;
  }
  return 0;
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
