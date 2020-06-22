import cli from 'cli-ux';
import filesize from 'filesize';
import {
  Repository,
  ItemsStatistic,
  START_DATE,
  repositoryDestinationPath,
} from './utils';
import { writeIssues } from './crawler/issues';
import { writePullRequests } from './crawler/pullRequests';
import { writeReleases } from './crawler/releases';
import { writeMilestones } from './crawler/milestones';

export interface CrawlResult {
  baseDirectory: string;
  error?: string;
}

export const crawlProjectDataFromUrl = async (
  url: string,
  lastUpdatedAt: string,
  accessToken: string
): Promise<CrawlResult> => {
  const withoutPrefix = url.replace(/^(https?:\/\/)?github.com/, '');
  const tokens = withoutPrefix.split('/').filter(x => x.length > 0);
  if (tokens.length !== 2) {
    console.log(JSON.stringify(tokens));
    console.error(
      `Cannot parse the given GitHub project URL "${url}"\nExample for a valid GitHub project URL: https://github.com/mui-org/material-ui`
    );
    process.exit(1);
  }

  const repository = {
    owner: tokens[0],
    name: tokens[1],
    lastUpdatedAt,
  };

  return crawlProjectData(repository, accessToken);
};

export const crawlProjectData = async (
  repository: Repository,
  accessToken: string
): Promise<CrawlResult> => {
  const headers = {
    ...repository,
    headers: {
      authorization: accessToken,
    },
  };

  console.log(
    `Start fetching data from https://github.com/${repository.owner}/${repository.name} ...`
  );
  const tasks = [
    writeIssues,
    writePullRequests,
    writeReleases,
    writeMilestones,
  ];

  // Calling the tasks parallel with Promise.all isn't faster as GitHub seems to block
  // concurrent calls.
  // So the tasks are run sequentially and we can show the user a progress bar :-).
  let results: ItemsStatistic[] = [];
  for (let i = 0; i < tasks.length; i++) {
    const result = await tasks[i](headers, repository);
    results.push(result);
  }

  const error = printFirstError(results);
  printResultTable(repository, results);

  const baseDirectory = repositoryDestinationPath(repository);
  return { baseDirectory, error };
};

const printFirstError = (results: ItemsStatistic[]): string | undefined => {
  const taskWithError = results.find(x => x.errorMessage);
  if (taskWithError) {
    console.error(
      `Error while fetching ${taskWithError.name}: ${taskWithError.errorMessage}`
    );
    return taskWithError.errorMessage;
  }

  return undefined;
};

const printResultTable = (
  repository: Repository,
  results: ItemsStatistic[]
): void => {
  console.log(
    `\nFetching new items since ${
      repository.lastUpdatedAt === START_DATE
        ? 'beginning'
        : repository.lastUpdatedAt
    } finished:`
  );

  cli.table(
    results,
    {
      name: { header: 'Task' },
      count: { header: 'Count' },
      sizeInBytes: { header: 'Size', get: row => filesize(row.sizeInBytes) },
      lastTimeInMilliseconds: {
        header: 'Time',
        get: row => Math.round(row.lastTimeInMilliseconds / 1000) + 's',
      },
    },
    {
      printLine: console.log,
    }
  );
};
