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
import * as cliProgress from 'cli-progress';

export interface CrawlResult {
  baseDirectory: string;
  error?: string;
}

export interface OwnerName {
  owner: string;
  name: string;
}

export const crawlProjectDataFromUrl = async (
  url: string,
  lastUpdatedAt: string,
  accessToken: string,
  multibar: cliProgress.MultiBar | undefined
): Promise<CrawlResult> => {
  const ownerName = ownerNameFromUrl(url);
  if (!ownerName) {
    console.error(
      `Cannot parse the given GitHub project URL "${url}"\nExample for a valid GitHub project URL: https://github.com/mui-org/material-ui`
    );
    process.exit(1);
  }

  const repository = {
    ...ownerName,
    lastUpdatedAt,
    multibar,
  };

  return crawlProjectData(repository, accessToken);
};

/** @return [owner, name] from URL */
export const ownerNameFromUrl = (
  repositoryUrl: string
): OwnerName | undefined => {
  const withoutPrefix = repositoryUrl.replace(/^(https?:\/\/)?github.com/, '');
  const tokens = withoutPrefix.split('/').filter(x => x.length > 0);
  return tokens.length === 2
    ? { owner: tokens[0], name: tokens[1] }
    : undefined;
};

export const crawlProjectData = async (
  repository: Repository,
  accessToken: string
): Promise<CrawlResult> => {
  const headers = {
    owner: repository.owner,
    name: repository.name,
    lastUpdatedAt: repository.lastUpdatedAt,
    headers: {
      authorization: accessToken,
    },
  };

  const tasks = [
    writeIssues,
    writePullRequests,
    writeReleases,
    writeMilestones,
  ];

  const results = await Promise.all(tasks.map(x => x(headers, repository)));

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
