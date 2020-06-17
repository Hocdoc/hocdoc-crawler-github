import { graphql } from '@octokit/graphql';
import { RequestParameters } from '@octokit/graphql/dist-types/types';
import cli from 'cli-ux';
import { promises as fs } from 'fs';

export interface Repository {
  owner: string;
  name: string;
}

export const writeProjectData = async (
  repository: Repository,
  accessToken: string
): Promise<void> => {
  const headers = {
    owner: repository.owner,
    name: repository.name,
    headers: {
      authorization: accessToken,
    },
  };

  await writeIssues(headers);
  //  writePullReqests(headers, repository);
};

export const writeIssues = async (
  headers: RequestParameters
): Promise<void> => {
  let hasPreviousPage = true;
  let startCursor = undefined;
  let issuesCount = 0;

  const progressBar = cli.progress({
    format: 'Fetching issues | {bar} | {value}/{total} new issues',
  });

  while (hasPreviousPage) {
    const response: any = await fetchIssues(headers, startCursor);
    const issues = (response?.nodes as any[]) || [];
    console.log(`Issues ${issues.length}`);
    hasPreviousPage = response?.pageInfo?.hasPreviousPage;
    startCursor = response?.pageInfo?.startCursor;

    if (issuesCount === 0) {
      progressBar.start(response.totalCount);
    }

    issuesCount += issues.length;
    progressBar.increment(issues.length);

    // console.log(`Issues: ${JSON.stringify(issues, undefined, 2)}`);
    await Promise.all(issues.map(x => writeIssue(x)));
  }

  progressBar.stop();
  console.log(`Fetched ${issuesCount} issues`);
};

const writeIssue = async (issue: any): Promise<void> => {
  if (issue.id) {
    console.log('Issue: ' + issue.title);
    const content = JSON.stringify(issue, undefined, 2);
    const path = '/tmp/' + issue.id + '.json';
    await fs.writeFile(path, content);
  }
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
    console.log('Fehler: ' + error);
  }

  return {};
};

export const writePullRequests = (repository: Repository): void => {
  // TODO
};
