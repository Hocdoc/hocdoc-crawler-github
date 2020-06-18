import cli from 'cli-ux';
import { promises as fs } from 'fs';
import filesize from 'filesize';
import path from 'path';
import { Repository, Statistic } from 'utils';
import { writeIssues } from './crawlerIssues';
import { writePullrequests } from './crawlerPullrequests';
import { writeReleases } from './crawlerReleases';

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
  const issues = {
    issuesCount: 0,
    issuesSizeInBytes: 0,
    errorMessage: undefined,
  }; //  await writeIssues(headers, repository);
  const pullrequests = await writePullrequests(headers, repository);
  const releases = await writeReleases(headers, repository);
  let result: Statistic = {
    issuesCount: issues.issuesCount || 0,
    issuesSizeInBytes: issues.issuesSizeInBytes || 0,
    pullrequestsCount: pullrequests.pullrequestsCount || 0,
    pullrequestsSizeInBytes: pullrequests.pullrequestsSizeInBytes || 0,
    releasesCount: releases.releasesCount || 0,
    releasesSizeInBytes: releases.releasesSizeInBytes || 0,
    errorMessage: issues.errorMessage || pullrequests.errorMessage,
  };

  const lastTime = Date.now() - startTimeMillis;
  if (result.errorMessage) {
    console.error(result.errorMessage);
  } else {
    console.log(
      `Fetched ${result.issuesCount} issues (${filesize(
        result.issuesSizeInBytes
      )}), ${result.pullrequestsCount} pullrequests (${filesize(
        result.pullrequestsSizeInBytes
      )}) and ${result.releasesCount} releases (${filesize(
        result.releasesSizeInBytes
      )}) in ${Math.round(lastTime / 1000)}s from https://github.com/${
        repository.owner
      }/${repository.name}`
    );
  }

  return result;
};

const repositoryDestinationPath = (repository: Repository): string =>
  path.join('/tmp', repository.owner, repository.name);

const createDirectories = async (repository: Repository) => {
  const destination = repositoryDestinationPath(repository);
  await fs.mkdir(path.join(destination, 'issues'), { recursive: true });
  await fs.mkdir(path.join(destination, 'pullrequests'), { recursive: true });
  await fs.mkdir(path.join(destination, 'releases'), { recursive: true });
};
