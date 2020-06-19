import cli from 'cli-ux';
import filesize from 'filesize';
import { Repository, ItemsStatistic } from 'utils';
import { writeIssues } from './crawlerIssues';
import { writePullRequests } from './crawlerPullRequests';
import { writeReleases } from './crawlerReleases';

export const writeProjectData = async (
  repository: Repository,
  accessToken: string
): Promise<any> => {
  const headers = {
    ...repository,
    headers: {
      authorization: accessToken,
    },
  };

  console.log(
    `Start fetching data from https://github.com/${repository.owner}/${repository.name}`
  );
  const tasks = [writeIssues, writePullRequests, writeReleases];
  const results = await Promise.all(tasks.map(x => x(headers, repository)));

  printFirstError(results);
  printResultTable(results);

  /* TODO: 
  - commitComments
  - milestones
  - projects?!

  Solange fetchen bis man auf das letzte Update-Datum kommt oder nix mehr da ist
  */
};

const printFirstError = (results: ItemsStatistic[]): void => {
  const taskWithError = results.find(x => x.errorMessage);
  if (taskWithError) {
    console.error(
      `Error while fetching ${taskWithError.name}: ${taskWithError.errorMessage}`
    );
  }
};

const printResultTable = (results: ItemsStatistic[]): void => {
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
