import path from 'path';
import { RequestParameters } from '@octokit/graphql/dist-types/types';
import { graphql } from '@octokit/graphql';
import { promises as fs } from 'fs';

export interface Repository {
  owner: string;
  name: string;
}

export interface Statistic {
  issuesCount: number;
  issuesSizeInBytes: number;
  pullrequestsCount: number;
  pullrequestsSizeInBytes: number;
  errorMessage?: string;
  releasesCount: number;
  releasesSizeInBytes: number;
}

const repositoryDestinationPath = (repository: Repository): string =>
  path.join('/tmp', repository.owner, repository.name);

export const graphqlErrorToMessage = (error: any): string => {
  return error.toString();
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
    filename
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
