#!/usr/bin/env node

import { crawlProjectData } from './crawlProjectData';
import yargs from 'yargs';
import { Repository } from './utils';

const urlToRepository = (url: string): Repository => {
  const withoutPrefix = url.replace(/^(https?:\/\/)?github.com/, '');
  const tokens = withoutPrefix.split('/').filter(x => x.length > 0);
  if (tokens.length !== 2) {
    console.log(JSON.stringify(tokens));
    console.error(
      `Cannot parse the given GitHub project URL "${url}"\nExample for a valid GitHub project URL: https://github.com/mui-org/material-ui`
    );
    process.exit(1);
  }

  return { owner: tokens[0], name: tokens[1], lastUpdatedAt: 'TODO' };
};

yargs
  .usage('Usage: $0 <command> [options]')
  .command(
    'crawl <url> <accessToken>',
    'Crawl the data from an GitHub project',
    {},
    argv => {
      const repository = urlToRepository(argv.url as string);
      crawlProjectData(repository, argv.accessToken as string);
    }
  ).argv;
