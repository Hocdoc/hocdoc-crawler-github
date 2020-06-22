#!/usr/bin/env node

import { crawlProjectData, crawlProjectDataFromUrl } from './crawlProjectData';
import yargs from 'yargs';
import { START_DATE } from './utils';

yargs
  .usage('Usage: $0 <command> [options]')
  .command(
    'crawl <url> <accessToken>',
    'Crawl the data from an GitHub project',
    {},
    argv => {
      crawlProjectDataFromUrl(
        argv.url as string,
        START_DATE,
        argv.accessToken as string
      );
    }
  )
  .example(
    'crawl',
    '"https://github.com/mui-org/material-ui-pickers" "token 8284PersonalTokenFromGitHubf8657bb96157db"'
  )
  .parse();

export { crawlProjectData, crawlProjectDataFromUrl };
