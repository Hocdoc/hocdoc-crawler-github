import { RequestParameters } from '@octokit/graphql/dist-types/types';
import cli from 'cli-ux';
import { isString } from 'lodash';
import { Repository, Statistic, fetchFromGithub, writeJsonFile } from './utils';

export const writeReleases = async (
  headers: RequestParameters,
  repository: Repository
): Promise<Partial<Statistic>> => {
  let hasPreviousPage = true;
  let startCursor = undefined;
  let releasesCount = 0;
  let releasesSizeInBytes = 0;

  const progressBar = cli.progress({
    format: 'Fetching releases | {bar} | {value}/{total} new issues',
  });

  while (hasPreviousPage) {
    const response: any = await fetchReleases(headers, startCursor);
    if (isString(response)) {
      progressBar.stop();
      return {
        releasesCount,
        releasesSizeInBytes,
        errorMessage: response as string,
      };
    }

    const releases = (response?.nodes as any[]) || [];
    hasPreviousPage = response?.pageInfo?.hasPreviousPage;
    startCursor = response?.pageInfo?.startCursor;

    if (releasesCount === 0) {
      progressBar.start(response.totalCount);
    }

    const sizes = await Promise.all(
      releases.map(x =>
        writeJsonFile('releases', x.tagName + '.json', x, repository)
      )
    );
    releasesSizeInBytes = sizes.reduce((x, y) => x + y, releasesSizeInBytes);

    releasesCount += releases.length;
    progressBar.increment(releases.length);
  }

  progressBar.stop();
  return { releasesCount, releasesSizeInBytes };
};

export const fetchReleases = async (
  headers: RequestParameters,
  startCursor: string | undefined
): Promise<any> => {
  const response = await fetchFromGithub(
    `
    query releases($owner: String!, $name: String!, $startCursor: String) {
      repository(owner: $owner, name: $name) {
        releases(last: 100, orderBy: {field: CREATED_AT, direction: DESC}, before: $startCursor) {
          totalCount
          nodes {
            id
            createdAt
            updatedAt
            description
            name
            tagName
            url
            author {
              avatarUrl(size: 160)
              login
              url
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

  return response.repository.releases;
};
