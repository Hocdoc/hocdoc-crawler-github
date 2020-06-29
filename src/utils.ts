import path from 'path';
import { RequestParameters } from '@octokit/graphql/dist-types/types';
import { graphql } from '@octokit/graphql';
import { promises as fs } from 'fs';
import sanitize from 'sanitize-filename';
import { isString } from 'lodash';
import * as cliProgress from 'cli-progress';

export interface Repository {
  baseDir: string;
  owner: string;
  name: string;
  lastUpdatedAt: string;
  multibar?: cliProgress.MultiBar;
}

export interface ItemsStatistic {
  name: string;
  count: number;
  sizeInBytes: number;
  errorMessage?: string;
  lastTimeInMilliseconds: number;
}

export interface Statistic {
  issues: ItemsStatistic;
  pullrequests: ItemsStatistic;
  releases: ItemsStatistic;
}

/** Minimal date, to fetch all entries since beginning */
export const START_DATE = '1000-04-27T01:02:03Z';

export const repositoryDestinationPath = (repository: Repository): string =>
  path.join(repository.baseDir, repository.owner, repository.name);

export const graphqlErrorToMessage = (error: any): string => {
  return error.toString();
};

const createDirectories = async (name: string, repository: Repository) => {
  const destination = repositoryDestinationPath(repository);
  await fs.mkdir(path.join(destination, name), { recursive: true });
};

/** @return size of the JSON issue in bytes */
export const writeJsonFile = async (
  baseDirectory: string,
  filename: string,
  content: any,
  repository: Repository
): Promise<number> => {
  const json = JSON.stringify(content, undefined, 2);
  const filepath = path.join(
    repositoryDestinationPath(repository),
    baseDirectory,
    sanitize(filename)
  );
  await fs.writeFile(filepath, json);
  return json.length;
};

export const fetchFromGithub = async (
  query: string,
  headers: RequestParameters,
  startCursor: string | undefined
): Promise<any> => {
  try {
    const result = await graphql(query, { ...headers, startCursor });

    return result as any;
  } catch (error) {
    return graphqlErrorToMessage(error);
  }
};

export const writeItems = async (
  name: string,
  itemToFilename: (item: any) => string,
  query: string,
  updatedAtFieldname: string,
  headers: RequestParameters,
  repository: Repository
): Promise<ItemsStatistic> => {
  let continueCrawling = true;
  let startCursor = null;
  let count = 0;
  let sizeInBytes = 0;
  const startTimeMillis = Date.now();
  let totalCount = 0;

  let progressBar: cliProgress.SingleBar | undefined = undefined;

  createDirectories(name, repository);

  while (continueCrawling) {
    const response: any = await fetchFromGithub(query, headers, startCursor);
    if (isString(response)) {
      progressBar?.stop();
      const lastTimeInMilliseconds = Date.now() - startTimeMillis;
      return {
        name,
        count,
        sizeInBytes,
        lastTimeInMilliseconds,
        errorMessage: response as string,
      };
    }

    const itemsResponse = response.repository[name];
    const items = (itemsResponse?.nodes as any[]) || [];

    if (count === 0) {
      totalCount = itemsResponse.totalCount;

      progressBar = repository.multibar?.create(
        itemsResponse.totalCount,
        items.length,
        {
          category: 'GitHub',
          task: name,
          location: `https://github.com/${repository.owner}/${repository.name}`,
        }
      );
    }

    const newItems = items.filter(x =>
      isNewItem(x[updatedAtFieldname], repository.lastUpdatedAt)
    );
    continueCrawling =
      newItems.length === items.length &&
      itemsResponse?.pageInfo?.hasPreviousPage;
    startCursor = itemsResponse?.pageInfo?.startCursor;

    const sizes = await Promise.all(
      newItems.map(x => writeJsonFile(name, itemToFilename(x), x, repository))
    );
    sizeInBytes = sizes.reduce((x, y) => x + y, sizeInBytes);

    count += newItems.length;
    progressBar?.increment(items.length);
  }

  // To avoid confusing the user, the progress bar is set to the maximum value at the end
  progressBar?.update(totalCount);
  progressBar?.stop();
  const lastTimeInMilliseconds = Date.now() - startTimeMillis;
  return { name, count, sizeInBytes, lastTimeInMilliseconds };
};

const isNewItem = (itemUpdatedAt: string, lastUpdatedAt: string): boolean =>
  new Date(itemUpdatedAt) >= new Date(lastUpdatedAt);
