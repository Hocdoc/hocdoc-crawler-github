import path from 'path';
import { RequestParameters } from '@octokit/graphql/dist-types/types';
import { graphql } from '@octokit/graphql';
import { promises as fs } from 'fs';
import sanitize from 'sanitize-filename';
import cli from 'cli-ux';
import { isString } from 'lodash';

export interface Repository {
  owner: string;
  name: string;
  lastUpdatedAt: string;
}

export interface ItemsStatistic {
  name: string;
  count: number;
  sizeInBytes: number;
  errorMessage?: string;
  lastTimeInMilliseconds: number;
}

const repositoryDestinationPath = (repository: Repository): string =>
  path.join('/tmp', repository.owner, repository.name);

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
  headers: RequestParameters,
  repository: Repository
): Promise<ItemsStatistic> => {
  let hasPreviousPage = true;
  let startCursor = undefined;
  let count = 0;
  let sizeInBytes = 0;
  const startTimeMillis = Date.now();

  const progressBar = cli.progress({
    format: `Fetching ${name} | {bar} | {value}/{total}`,
  });

  createDirectories(name, repository);

  while (hasPreviousPage) {
    const response: any = await fetchFromGithub(query, headers, startCursor);
    if (isString(response)) {
      progressBar.stop();
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
    hasPreviousPage = itemsResponse?.pageInfo?.hasPreviousPage;
    startCursor = itemsResponse?.pageInfo?.startCursor;

    if (count === 0) {
      progressBar.start(itemsResponse.totalCount);
    }

    const sizes = await Promise.all(
      items.map(x => writeJsonFile(name, itemToFilename(x), x, repository))
    );
    sizeInBytes = sizes.reduce((x, y) => x + y, sizeInBytes);

    count += items.length;
    progressBar.increment(items.length);
  }

  progressBar.stop();
  const lastTimeInMilliseconds = Date.now() - startTimeMillis;
  return { name, count, sizeInBytes, lastTimeInMilliseconds };
};
