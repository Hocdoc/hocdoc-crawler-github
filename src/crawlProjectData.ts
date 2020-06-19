import cli from 'cli-ux';
import filesize from 'filesize';
import { Repository, ItemsStatistic } from 'utils';
import { writeIssues } from './crawler/issues';
import { writePullRequests } from './crawler/pullRequests';
import { writeReleases } from './crawler/releases';
import { writeMilestones } from './crawler/milestones';

export const crawlProjectData = async (
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

  printFirstError(results);
  printResultTable(results);
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
  console.log('\nFetching finished:');
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
